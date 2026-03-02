import { PriceFetcher, PriceResult } from "@/app/types";

interface BestBuyProduct {
  sku: number;
  name: string;
  salePrice: number;
  regularPrice: number;
  onSale: boolean;
  url: string;
  image: string;
  categoryPath: { name: string }[];
  inStoreAvailability: boolean;
  onlineAvailability: boolean;
  shortDescription?: string;
}

interface BestBuySearchResponse {
  from: number;
  to: number;
  total: number;
  products: BestBuyProduct[];
}

export class BestBuyFetcher implements PriceFetcher {
  readonly name = "BestBuy";
  readonly retailer = "bestbuy";
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.bestbuy.com/v1";

  constructor() {
    const key = process.env.BESTBUY_API_KEY;
    if (!key) {
      throw new Error("BESTBUY_API_KEY is not set");
    }
    this.apiKey = key;
  }

  async search(query: string): Promise<PriceResult[]> {
    const searchQuery = encodeURIComponent(query);
    const url = `${this.baseUrl}/products((search=${searchQuery}))?apiKey=${this.apiKey}&sort=salePrice.asc&show=sku,name,salePrice,regularPrice,onSale,url,image,categoryPath,inStoreAvailability,onlineAvailability,shortDescription&pageSize=10&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Best Buy API error: ${response.status} ${response.statusText}`);
    }

    const data: BestBuySearchResponse = await response.json();

    return data.products.map((product) => ({
      retailer: this.retailer,
      price: product.salePrice,
      currency: "USD",
      url: `https://www.bestbuy.com${product.url}`,
      inStock: product.onlineAvailability || product.inStoreAvailability,
      lastUpdated: new Date(),
    }));
  }

  async getProduct(sku: string): Promise<PriceResult | null> {
    const url = `${this.baseUrl}/products/${sku}.json?apiKey=${this.apiKey}&show=sku,name,salePrice,regularPrice,onSale,url,image,inStoreAvailability,onlineAvailability`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Best Buy API error: ${response.status}`);
    }

    const product: BestBuyProduct = await response.json();

    return {
      retailer: this.retailer,
      price: product.salePrice,
      currency: "USD",
      url: `https://www.bestbuy.com${product.url}`,
      inStock: product.onlineAvailability || product.inStoreAvailability,
      lastUpdated: new Date(),
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/products(sku=999999)?apiKey=${this.apiKey}&format=json`
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
