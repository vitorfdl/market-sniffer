import { Account, Analysis, Utils } from "@tago-io/sdk";
import { Data, TagoContext } from "@tago-io/sdk/lib/types";

import { filterResults } from "./lib/filter";
import { IProduct } from "./model/product-interface";
import { runKabum } from "./services/kabum";
import { runML } from "./services/mercado-livre";
import { runTerabyte } from "./services/terabyte";

let account: Account;

async function storeTago(deviceID: string, resultList: IProduct[], formData: any[]) {
  const device = await Utils.getDevice(account, deviceID);
  await account.devices.emptyDeviceData(deviceID);

  // filter duplicated ID on resultList
  let uniqueResultList = resultList.filter((item, index, self) => self.findIndex((t) => t.link === item.link) === index);
  // filter product with same name and same price
  uniqueResultList = uniqueResultList.filter((item, index, self) => self.findIndex((t) => t.title === item.title && t.price === item.price && t.totalJuros === item.totalJuros) === index);

  // { title, price, link, juros, totalJuros };
  const result = uniqueResultList.map((item, index) => {
    return {
      variable: "price_result",
      value: item.title,
      group: `price_result_${index}`,
      metadata: {
        price: item.price,
        link: item.link,
        juros: item.juros,
        totalJuros: item.totalJuros,
        source: item.source,
      },
    };
  });

  await device.sendDataStreaming(result, {}).then(console.log);
  await device.sendData([...formData, { variable: "validation", value: "Done", metadata: { type: "success" } }]);
}

async function startProccess(context: TagoContext, rScope: Data[]) {
  const scope = structuredClone(rScope);
  const envVariables = Utils.envToJson(context.environment);

  if (!envVariables.token) {
    console.log("Profile Token not found");
    return;
  }

  account = new Account({ token: envVariables.token });
  console.log(scope[0].device);
  const device = await Utils.getDevice(account, scope[0].device);

  const searchFor = scope.find((x) => x.variable === "search_for")?.value as string;
  const ensureRule = (scope.find((x) => x.variable === "ensure_rule")?.value as string)?.split(";") || [];
  const priceBelow = scope.find((x) => x.variable === "price_below")?.value as number;
  const priceAbove = scope.find((x) => x.variable === "price_above")?.value as number;
  const resultAmount = (scope.find((x) => x.variable === "result_amount")?.value as number) || 30;

  if (!searchFor) {
    await device.sendData([{ variable: "validation", value: "Error , search for not provided", metadata: { type: "danger" } }]);
    return;
  }

  await device.sendData([{ variable: "validation", value: "Getting results, please wait...", metadata: { type: "warning" } }]);

  const resultList = await Promise.all([runML(`https://www.mercadolivre.com.br/`, searchFor), runTerabyte("https://www.terabyteshop.com.br/busca", searchFor), runKabum("https://www.kabum.com.br/busca", searchFor, ensureRule)]);
  const flatResult = resultList.flat();

  console.log(`Total de resultados FLAT: ${flatResult.length}`);
  let ensuredName = filterResults(flatResult).ensureNameRule(ensureRule);
  if (priceBelow && priceBelow !== 0) {
    ensuredName = ensuredName.filterPriceBelow(priceBelow);
  }

  if (priceAbove && priceAbove !== 0) {
    ensuredName = ensuredName.filterPriceAbove(priceAbove);
  }

  console.log(`Total de resultados: ${ensuredName.result.length}`);

  const bestPrice = ensuredName.sortByPrice("asc").getFirst(resultAmount);
  const bestJuros = ensuredName.sortBytotalJuros("asc").getFirst(resultAmount);

  await storeTago(scope[0].device, [...bestJuros.result, ...bestPrice.result], scope);
}

Analysis.use(startProccess, { token: "Your-Analysis-Token" });
