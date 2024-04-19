import async from "async";
import { Browser, launch, Page } from "puppeteer";

import { IProduct } from "../model/product-interface";
import { IQueryResponse } from "../model/query-response";

async function kabumItemQuery({ browser, item }: { browser: Browser; item: IProduct }) {
  const page = await browser.newPage();
  await page.goto(item.link, { timeout: 10 * 1000 });

  const result = await page.evaluate(() => {
    const element = document.querySelector(".container-purchase");
    if (!element) {
      return;
    }

    const price = Number(
      element
        .querySelector(".finalPrice")
        // @ts-expect-error
        ?.innerText.replace(/[^0-9,]/g, "")
        .replace(",", ".")
    );

    // @ts-expect-error
    const jurosText = element.querySelector(".cardParcels")?.innerText;
    const number = Number(jurosText?.match(/\d+/g)[0]);

    // do the match but make sure to include any dots in the number, like 1.499,09
    const secondNumber = Number(
      jurosText
        ?.match(/(\d+\.)*\d+,\d+/g)[0]
        .replace(/\./g, "")
        .replace(",", ".")
    );

    const totalJuros = jurosText ? number * secondNumber : 0;

    return { price, totalJuros };
  });

  await page.close();

  item.price = result?.price as number;
  item.totalJuros = result?.totalJuros as number;
}

async function kabumQuery(browser: Browser, page: Page, ensureNames: string[]): Promise<IQueryResponse> {
  const result = await page.evaluate(() => {
    // query all elements with class "productCard"
    const elements = document.querySelectorAll(".productCard");
    // get the parameter title inside the element and return an array
    const items = Array.from(elements).map((element) => {
      // check if there is any class tbt_esgotado in the element
      if (element.querySelector(".unavailableFooterCard")) {
        return;
      }

      const id = Math.random().toString(36).substr(2, 9);

      let title = element.querySelector(".nameCard")?.textContent;
      if (!title) {
        title = "";
      }
      // // get the first href in the element
      // @ts-expect-error
      const link = element.querySelector("a.productLink")?.href;

      // // get the content of .prod-juros, the text will be like '12x de R$ 1.449,09 sem juros', need to multiply 12x number by the 1499 number
      // const jurosText = element.querySelector(".prod-juros")?.innerText;
      // const number = Number(jurosText?.match(/\d+/g)[0]);

      // // do the match but make sure to include any dots in the number, like 1.499,09
      // const secondNumber = Number(
      //   jurosText
      //     ?.match(/(\d+\.)*\d+,\d+/g)[0]
      //     .replace(/\./g, "")
      //     .replace(",", ".")
      // );

      // const totalJuros = jurosText ? number * secondNumber : 0;
      return { id, title, link, source: "kabum", price: 0, totalJuros: 0, juros: false };
    });

    // find the element in the document with title Seguinte and role button, and get the href
    // const nextLink = document.querySelector('[title="Seguinte"][role="button"]')?.href;

    // const elementList = Array.from(elements);
    return { items };
  });

  await page.close();

  result.items = result.items.filter((item) => item && ensureNames.some((x) => item.title.toLowerCase().includes(x.toLowerCase())) && item.link);

  const queue = async.queue(kabumItemQuery, 4);
  queue.error(console.log);

  for (const item of result.items) {
    if (!item) {
      continue;
    }
    queue.push({ item, browser });
  }

  if (result.items.length) {
    await queue.drain();
  }

  return result as any;
}

async function runKabum(URL: string, searchFor: string, ensureNames: string[] = []) {
  // URL is https://www.kabum.com.br/busca/4070-ti?page_number=1&page_size=100&facet_filters=&sort=-date_product_arrivedi need to format URL and searchFor to create the URL.
  // Need to format the searchFor to replace spaces with +. searchFor value is only 4070 ti, but the URL needs to be 4070-ti
  const queryString = searchFor.replace(/ /g, "-");
  let link: string | undefined = `${URL}/${queryString}?page_number=1&page_size=100&facet_filters=&sort=-date_product_arrived`;
  const browser = await launch({ headless: "shell" });
  const page = await browser.newPage();
  await page.goto(link);

  // let form = await page.$("a#pdmore");
  // while (form) {
  //   await form.evaluate((form) => form.click());
  //   await page.waitForTimeout(1000);
  //   form = await page.$("a#pdmore");
  // }

  const result: IProduct[] = [];

  while (link) {
    const queryResult = await kabumQuery(browser, page, ensureNames).catch(console.log);
    if (!queryResult) {
      break;
    }
    // console.log(queryResult);
    link = queryResult?.nextLink;

    result.push(...queryResult.items);
    if (link) {
      await page.goto(link);
    }
  }

  await browser.close();

  return result;
}

// runKabum("https://www.kabum.com.br/busca", "4070ti", ["4070 ti", "4070ti"]).then((result) => console.log(result));

export { runKabum };
