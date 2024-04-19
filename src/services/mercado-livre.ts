import { launch, Page } from "puppeteer";

import { IProduct } from "../model/product-interface";
import { IQueryResponse } from "../model/query-response";

async function mercadoLivreQuery(page: Page): Promise<IQueryResponse> {
  const result = await page.evaluate(() => {
    // query all elements with class "ui-search-layout__item"
    const elements = document.querySelectorAll(".ui-search-layout__item");

    // get the parameter title inside the element and return an array
    const items = Array.from(elements).map((element) => {
      // generate a random ID
      const id = Math.random().toString(36).substr(2, 9);

      // @ts-expect-error
      const title = element.querySelector(".ui-search-item__title.shops__item-title")?.innerText;

      // @ts-expect-error get the content of element with price-tag-text-sr-only and get only number of the price
      const price = Number(element.querySelector(".ui-search-price__second-line.shops__price-second-line")?.querySelector(".price-tag-text-sr-only")?.innerText?.replace(/\D/g, ""));

      // get the first href in the element
      const link = element?.querySelector("a")?.href;

      // @ts-expect-error normalize the innerText such as 'em\n12x\n271 reais con 46 centavos\nR$\n271\n,\n46' to 'em12x271 reais con 46 centavos\nR$\n271\n,\n46
      const jurosText = element.querySelector(".ui-search-installments")?.innerText?.replace(/\n/g, " ");
      const noJuros = jurosText?.toLowerCase()?.includes("sem juros");

      const number = Number(jurosText?.match(/\d+/g)?.[0]);

      // do the match but make sure to include any dots in the number, like 1.499,09
      const secondNumber = Number(jurosText?.match(/\d+/g)?.[1].replace(/\./g, "").replace(",", "."));

      const totalJuros = jurosText ? number * secondNumber : 0;

      return { id, title, price, link, juros: !noJuros || totalJuros > price, totalJuros, source: "mercado-livre" } as IProduct;
    });

    // @ts-expect-error find the element in the document with title Seguinte and role button, and get the href
    const nextLink = document.querySelector('[title="Seguinte"][role="button"]')?.href;

    // const items = Array.from(elements);

    return { items, nextLink };
  });

  // @ts-expect-error if result is an error, throw it
  if (typeof result === "error") {
    throw result;
  }

  return result;
}

async function runML(URL: string, searchString: string): Promise<IProduct[]> {
  const browser = await launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto(URL);

  // wait page to load
  await page.waitForSelector(".nav-search-input");

  // get the input id cb1-edit and type "4070 Ti"
  const input = await page.$(".nav-search-input");
  if (!input) {
    console.log("INPUT É NULO");
    return [];
  }
  await input.type(searchString);

  // click the nav-search-btn button
  const btnform = await page.$("button.nav-search-btn");
  if (!btnform) {
    console.log("BTNFORM É NULO");
    return [];
  }

  await btnform.evaluate((form) => form.click());

  // wait for the page to load
  await page.waitForNavigation();

  const result: IProduct[] = [];

  let link: string | undefined = String(URL);
  do {
    const queryResult = await mercadoLivreQuery(page);
    link = queryResult.nextLink;

    result.push(...queryResult.items);
    if (queryResult.items.length > 600) {
      break;
    }
    if (link) {
      await page.goto(link);
    }
  } while (link);

  await browser.close();

  return result;
}

// runML("https://www.mercadolivre.com.br/", "4070 ti").then(console.log);

export { runML };
