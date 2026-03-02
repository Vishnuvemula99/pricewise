import { PriceFetcher, PriceResult, ProductSearchResult } from "@/app/types";
import { BestBuyFetcher } from "./bestbuy";
import { SerperFetcher } from "./serper";

/**
 * PriceFetcherRegistry - Strategy Pattern
 *
 * Manages multiple price fetcher strategies and aggregates results.
 * Each fetcher implements the PriceFetcher interface, making it easy
 * to add new retailers without modifying existing code.
 */
export class PriceFetcherRegistry {
  private fetchers: PriceFetcher[] = [];

  register(fetcher: PriceFetcher): void {
    this.fetchers.push(fetcher);
  }

  async searchAll(query: string): Promise<ProductSearchResult> {
    const results = await Promise.allSettled(
      this.fetchers.map((fetcher) => fetcher.search(query))
    );

    const allPrices: PriceResult[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        allPrices.push(...result.value);
      } else {
        console.warn(`Fetcher failed: ${result.reason}`);
      }
    }

    // Deduplicate by retailer (keep lowest price per retailer)
    const byRetailer = new Map<string, PriceResult>();
    for (const price of allPrices) {
      const existing = byRetailer.get(price.retailer);
      if (!existing || price.price < existing.price) {
        byRetailer.set(price.retailer, price);
      }
    }

    const uniquePrices = Array.from(byRetailer.values())
      .filter((p) => p.price > 0)
      .sort((a, b) => a.price - b.price);

    const prices = uniquePrices.map((p) => p.price);
    const sum = prices.reduce((a, b) => a + b, 0);

    return {
      name: query,
      category: "unknown",
      prices: uniquePrices,
      lowestPrice: prices.length > 0 ? Math.min(...prices) : 0,
      highestPrice: prices.length > 0 ? Math.max(...prices) : 0,
      averagePrice: prices.length > 0 ? Math.round((sum / prices.length) * 100) / 100 : 0,
      retailerCount: uniquePrices.length,
    };
  }

  getAvailableFetchers(): string[] {
    return this.fetchers.map((f) => f.name);
  }
}

/**
 * Creates a pre-configured registry with all available fetchers.
 * Fetchers that are missing API keys are silently skipped.
 */
export function createFetcherRegistry(): PriceFetcherRegistry {
  const registry = new PriceFetcherRegistry();

  // Register each fetcher, skip if API key is missing
  const fetchers = [
    { create: () => new BestBuyFetcher(), name: "BestBuy" },
    { create: () => new SerperFetcher(), name: "Serper" },
  ];

  for (const { create, name } of fetchers) {
    try {
      registry.register(create());
    } catch (error) {
      console.warn(`Skipping ${name} fetcher: ${(error as Error).message}`);
    }
  }

  return registry;
}

export { BestBuyFetcher } from "./bestbuy";
export { SerperFetcher } from "./serper";
