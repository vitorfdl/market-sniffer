import { launch, Page } from "puppeteer";

import { IProduct } from "../model/product-interface";
import { IQueryResponse } from "../model/query-response";

async function terabyteQuery(page: Page) {
  const result = await page.evaluate(() => {
    // query all elements with class "commerce_columns_item_inner"
    const elements = document.querySelectorAll("div.commerce_columns_item_inner");

    // get the parameter title inside the element and return an array
    const items = Array.from(elements)
      .map((element) => {
        // check if there is any class tbt_esgotado in the element
        if (element.querySelector(".tbt_esgotado")) {
          return;
        }
        const id = Math.random().toString(36).substr(2, 9);

        const title = element.querySelector("a.prod-name")?.textContent;

        // get the content of element with .prod-new-price, the text will be like 'R$ 17.124,70 à vista', and get only number of the price
        const price = Number(
          element
            .querySelector("div.prod-new-price")
            ?.textContent?.replace(/[^0-9,]/g, "")
            .replace(",", ".")
        );

        // get the first href in the element
        const link = element.querySelector("a")?.href;

        // get the content of .prod-juros, the text will be like '12x de R$ 1.449,09 sem juros', need to multiply 12x number by the 1499 number
        const jurosText = element.querySelector(".prod-juros")?.textContent;
        const number = Number(jurosText?.match(/\d+/g)?.[0]);

        // do the match but make sure to include any dots in the number, like 1.499,09
        const secondNumber = Number(
          jurosText
            ?.match(/(\d+\.)*\d+,\d+/g)?.[0]
            ?.replace(/\./g, "")
            ?.replace(",", ".")
        );

        const totalJuros = jurosText ? number * secondNumber : 0;

        return { id, title, price, link, juros: totalJuros > price, totalJuros, source: "terabyte" };
        // return Array.from(elements);
      })
      .filter((x) => x);

    // @ts-expect-error find the element in the document with title Seguinte and role button, and get the href
    const nextLink = document.querySelector("a#pdmore")?.href;

    // const elementList = Array.from(elements);

    return { items, nextLink };
  });

  // @ts-expect-error
  if (typeof result === "error") {
    throw result;
  }

  return result as IQueryResponse;
}

async function runTerabyte(URL: string, searchFor: string) {
  // concatenates the URL with the search term as querystring str=, format the searchFor first
  const queryString = searchFor.replace(/ /g, "+");
  let link: string | undefined = `${URL}?str=${queryString}`;
  const browser = await launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto(link);

  let form = await page.$("a#pdmore");
  while (form) {
    await form.evaluate((form) => form.click());
    await page.waitForTimeout(1000);
    form = await page.$("a#pdmore");
  }

  const result: IProduct[] = [];

  while (link) {
    const queryResult = await terabyteQuery(page);
    link = queryResult.nextLink;

    result.push(...queryResult.items);
    if (link) {
      await page.goto(link);
    }
  }

  await browser.close();

  return result;
}

// runTerabyte("https://www.terabyteshop.com.br/busca?str=4070+ti").then((result) => console.log(result));

export { runTerabyte };
