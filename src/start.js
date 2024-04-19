import { Account, Device, Utils } from "@tago-io/sdk";
import { runML } from "./services/mercado-livre";
import { runTerabyte } from "./services/terabyte";
import { filterResults } from "./lib/filter";
const deviceID = "DEVICE-ID";
const account = new Account({ token: "Your-Profile-Token" });

async function storeTago(resultList) {
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
      },
    };
  });

  await device.sendDataStreaming(result, {}).then(console.log);
}

async function startProccess() {
  const searchFor = "placa de video 4070";

  const queue = async.queue();

  const resultList = [await runML(`https://www.mercadolivre.com.br/`, searchFor), await runTerabyte("https://www.terabyteshop.com.br/busca", searchFor)];
  const flatResult = resultList.flat();
  console.log(`Total de resultados FLAT: ${flatResult.length}`);
  const ensuredName = filterResults(flatResult).ensureNameRule("4070");

  console.log(`Total de resultados: ${ensuredName.result.length}`);

  const bestPrice = ensuredName.sortByPrice("asc").getFirst(30);
  const bestJuros = ensuredName.sortBytotalJuros("asc").getFirst(30);

  await storeTago([...bestJuros.result, ...bestPrice.result]);
}

startProccess();
