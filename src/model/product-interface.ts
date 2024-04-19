interface IProduct {
  // id, title, price, link, juros: !noJuros || totalJuros > price, totalJuros, source: "mercado-livre"
  id: string;
  title: string;
  price: number;
  link: string;
  juros: boolean;
  totalJuros: number;
  source: string;
}

export { IProduct };
