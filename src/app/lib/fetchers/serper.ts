import { PriceFetcher, PriceResult } from "@/app/types";

interface SerperShoppingResult {
  title: string;
  source: string;
  link: string;
  price: string;
  delivery?: string;
  imageUrl?: string;
  rating?: number;
  ratingCount?: number;
  position: number;
}

interface SerperShoppingResponse {
  shopping: SerperShoppingResult[];
  searchParameters: {
    q: string;
    type: string;
  };
}

async function serperFetch(url: string, apiKey: string, body: object): Promise<Response> {
  const nodeFetch = (await import("node-fetch")).default;
  return nodeFetch(url, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }) as unknown as Response;
}

export class SerperFetcher implements PriceFetcher {
  readonly name = "Google Shopping (via Serper)";
  readonly retailer = "google_shopping";
  private readonly apiKey: string;
  private readonly baseUrl = "https://google.serper.dev/shopping";

  constructor() {
    const key = process.env.SERPER_API_KEY;
    if (!key) {
      throw new Error("SERPER_API_KEY is not set");
    }
    this.apiKey = key;
  }

  // ─── ALLOWLIST: Only these trusted retailers are ever shown ──────
  // This is an allowlist-only approach. No fallback to unknown stores.
  // If a retailer isn't here, it doesn't show up. Period.
  private static readonly TRUSTED_RETAILERS: Record<string, string> = {
    // Big-box / general
    "amazon": "Amazon",
    "walmart": "Walmart",
    "best buy": "Best Buy",
    "bestbuy": "Best Buy",
    "target": "Target",
    "costco": "Costco",
    "sam's club": "Sam's Club",
    "samsclub": "Sam's Club",
    "bjs": "BJ's",
    "bj's": "BJ's",
    // Electronics specialists
    "newegg": "Newegg",
    "b&h": "B&H Photo",
    "b & h": "B&H Photo",
    "bhphoto": "B&H Photo",
    "adorama": "Adorama",
    "micro center": "Micro Center",
    "abt": "Abt Electronics",
    "crutchfield": "Crutchfield",
    // OEM / brand stores
    "apple": "Apple",
    "samsung": "Samsung",
    "dell": "Dell",
    "hp.com": "HP",
    "hp store": "HP",
    "lenovo": "Lenovo",
    "sony": "Sony",
    "google store": "Google Store",
    "microsoft": "Microsoft",
    "bose": "Bose",
    // Carriers
    "verizon": "Verizon",
    "at&t": "AT&T",
    "t-mobile": "T-Mobile",
    "visible": "Visible",
    // Home improvement
    "home depot": "Home Depot",
    "lowe": "Lowe's",
    // Office / business
    "staples": "Staples",
    "office depot": "Office Depot",
    // Department stores
    "kohls": "Kohl's",
    "kohl's": "Kohl's",
    "macy": "Macy's",
    "nordstrom": "Nordstrom",
    "jcpenney": "JCPenney",
    // Fashion / beauty
    "nike": "Nike",
    "adidas": "Adidas",
    "sephora": "Sephora",
    "ulta": "Ulta",
    // Specialty
    "rei": "REI",
    "dick's sporting": "Dick's Sporting Goods",
    "gamestop": "GameStop",
    "wayfair": "Wayfair",
    "overstock": "Overstock",
    // TV shopping (legitimate, large US retailers)
    "hsn": "HSN",
    "qvc": "QVC",
    // Discount / value
    "woot": "Woot",
    "tj maxx": "TJ Maxx",
    "marshalls": "Marshalls",
    // Pharmacy
    "walgreens": "Walgreens",
    "cvs": "CVS",
  };

  private static readonly USED_KEYWORDS = [
    "used", "refurbished", "renewed", "pre-owned", "preowned",
    "open box", "open-box", "certified pre", "like new -",
    "for parts", "repair", "broken",
  ];

  // ─── SEARCH ──────────────────────────────────────────────────────
  async search(query: string): Promise<PriceResult[]> {
    try {
      const response = await serperFetch(this.baseUrl, this.apiKey, {
        q: query,
        num: 40,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Serper API error: ${response.status} ${text}`);
      }

      const data = (await response.json()) as SerperShoppingResponse;
      if (!data.shopping) return [];

      // Pipeline: trusted retailers only → no used items → dedup → sort by price
      const results = data.shopping
        .filter((r) => this.isTrustedRetailer(r.source))
        .filter((r) => !this.isUsedProduct(r.title))
        .filter((r) => this.parsePrice(r.price) > 0)
        .map((r) => ({
          retailer: this.resolveRetailerName(r.source),
          price: this.parsePrice(r.price),
          currency: "USD",
          url: r.link,
          inStock: true,
          lastUpdated: new Date(),
        }));

      // Dedup: keep cheapest per retailer, then sort low → high
      return this.dedup(results).sort((a, b) => a.price - b.price);
    } catch (error) {
      console.error("Serper search error:", (error as Error).message);
      throw error;
    }
  }

  async getProduct(_productId: string): Promise<PriceResult | null> {
    return null;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await serperFetch(this.baseUrl, this.apiKey, { q: "test", num: 1 });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────────────

  private isTrustedRetailer(source: string): boolean {
    const lower = source.toLowerCase();
    return Object.keys(SerperFetcher.TRUSTED_RETAILERS).some((key) =>
      lower.includes(key)
    );
  }

  private resolveRetailerName(source: string): string {
    const lower = source.toLowerCase();
    for (const [key, name] of Object.entries(SerperFetcher.TRUSTED_RETAILERS)) {
      if (lower.includes(key)) return name;
    }
    return source;
  }

  private isUsedProduct(title: string): boolean {
    const lower = title.toLowerCase();
    return SerperFetcher.USED_KEYWORDS.some((kw) => lower.includes(kw));
  }

  private parsePrice(priceStr: string): number {
    const cleaned = priceStr.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  }

  /** Keep only the cheapest result per retailer */
  private dedup(results: PriceResult[]): PriceResult[] {
    const map = new Map<string, PriceResult>();
    for (const r of results) {
      const key = r.retailer.toLowerCase();
      const existing = map.get(key);
      if (!existing || r.price < existing.price) {
        map.set(key, r);
      }
    }
    return Array.from(map.values());
  }
}
