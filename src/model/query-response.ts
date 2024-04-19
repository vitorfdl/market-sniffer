import { IProduct } from "./product-interface";

interface IQueryResponse {
  nextLink?: string;
  items: IProduct[];
}

export { IQueryResponse };
