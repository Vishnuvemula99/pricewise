/**
 * Daily Price Fetch Script
 *
 * Run via: npm run cron:prices
 * Schedule via crontab: 0 8 * * * cd /path/to/pricewise && npm run cron:prices
 *
 * Fetches prices for all tracked products via Serper.dev (Google Shopping)
 * and stores snapshots in the database for price history tracking.
 * Also checks price alerts after fetching.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_URL = "https://google.serper.dev/shopping";

// Default products to track if DB is empty
const DEFAULT_PRODUCTS = [
  { name: "Sony WH-1000XM5", category: "headphones" },
  { name: "Apple AirPods Pro 2", category: "headphones" },
  { name: "MacBook Air M3", category: "laptops" },
  { name: "iPad Air", category: "tablets" },
  { name: "Samsung Galaxy S24", category: "phones" },
  { name: "PS5 Console", category: "gaming" },
  { name: "LG C4 OLED TV 65", category: "tvs" },
  { name: "Dyson V15 Detect", category: "appliances" },
];

const MAJOR_RETAILERS: Record<string, string> = {
  "amazon": "Amazon",
  "walmart": "Walmart",
  "best buy": "Best Buy",
  "bestbuy": "Best Buy",
  "target": "Target",
  "ebay": "eBay",
  "newegg": "Newegg",
  "costco": "Costco",
  "home depot": "Home Depot",
  "b&h": "B&H Photo",
  "apple": "Apple",
  "samsung": "Samsung",
  "dell": "Dell",
  "lenovo": "Lenovo",
};

function isMajorRetailer(source: string): boolean {
  const lower = source.toLowerCase();
  return Object.keys(MAJOR_RETAILERS).some((key) => lower.includes(key));
}

function normalizeRetailer(source: string): string {
  const lower = source.toLowerCase();
  for (const [key, displayName] of Object.entries(MAJOR_RETAILERS)) {
    if (lower.includes(key)) return displayName;
  }
  return source;
}

function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

async function fetchSerperPrices(query: string): Promise<{ retailer: string; price: number; url: string }[]> {
  if (!SERPER_API_KEY) {
    console.warn("  SERPER_API_KEY not set, skipping");
    return [];
  }

  const nodeFetch = (await import("node-fetch")).default;
  const response = await nodeFetch(SERPER_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": SERPER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 20 }),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`);
  }

  const data = await response.json() as { shopping?: { source: string; price: string; link: string }[] };

  if (!data.shopping) return [];

  return data.shopping
    .filter((r) => isMajorRetailer(r.source))
    .map((r) => ({
      retailer: normalizeRetailer(r.source),
      price: parsePrice(r.price),
      url: r.link,
    }))
    .filter((r) => r.price > 0);
}

async function checkAlerts() {
  console.log("\n  Checking price alerts...");

  const activeAlerts = await prisma.priceAlert.findMany({
    where: { isActive: true, triggeredAt: null },
    include: {
      product: {
        include: {
          prices: {
            orderBy: { fetchedAt: "desc" },
            take: 5,
          },
        },
      },
    },
  });

  let triggered = 0;
  for (const alert of activeAlerts) {
    const lowestPrice = alert.product.prices.length > 0
      ? Math.min(...alert.product.prices.map((p) => p.price))
      : null;

    if (lowestPrice !== null && lowestPrice <= alert.targetPrice) {
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { triggeredAt: new Date() },
      });
      console.log(`    🔔 TRIGGERED: ${alert.product.name} hit $${lowestPrice} (target: $${alert.targetPrice})`);
      triggered++;
    }
  }

  console.log(`  ${triggered} alert(s) triggered out of ${activeAlerts.length} active`);
}

async function fetchAndStorePrices() {
  console.log(`[${new Date().toISOString()}] Starting daily price fetch...`);

  if (!SERPER_API_KEY) {
    console.error("SERPER_API_KEY not set. Add it to .env");
    return;
  }

  // Get products to track: all products in DB + defaults
  const dbProducts = await prisma.product.findMany();
  const productsToTrack = dbProducts.length > 0
    ? dbProducts.map((p) => ({ name: p.name, category: p.category, id: p.id }))
    : DEFAULT_PRODUCTS.map((p) => ({ ...p, id: null as string | null }));

  let totalPrices = 0;

  for (const tracked of productsToTrack) {
    try {
      console.log(`  Fetching: ${tracked.name}`);

      // Ensure product exists in DB
      let productId = tracked.id;
      if (!productId) {
        const slug = tracked.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        let product = await prisma.product.findUnique({ where: { slug } });
        if (!product) {
          product = await prisma.product.create({
            data: {
              name: tracked.name,
              slug,
              category: tracked.category,
            },
          });
        }
        productId = product.id;
      }

      const prices = await fetchSerperPrices(tracked.name);

      if (prices.length > 0) {
        // Deduplicate by retailer (keep lowest)
        const byRetailer = new Map<string, typeof prices[0]>();
        for (const p of prices) {
          const existing = byRetailer.get(p.retailer);
          if (!existing || p.price < existing.price) {
            byRetailer.set(p.retailer, p);
          }
        }

        const uniquePrices = Array.from(byRetailer.values());

        await prisma.priceRecord.createMany({
          data: uniquePrices.map((p) => ({
            productId: productId!,
            retailer: p.retailer,
            price: p.price,
            url: p.url,
            inStock: true,
          })),
        });

        const lowest = Math.min(...uniquePrices.map((p) => p.price));
        console.log(`    ✓ ${uniquePrices.length} prices stored (lowest: $${lowest})`);
        totalPrices += uniquePrices.length;
      } else {
        console.log(`    ⚠ No results from Serper`);
      }

      // Rate limit: 500ms between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`    ✗ Error fetching ${tracked.name}:`, (error as Error).message);
    }
  }

  // Check alerts after fetching new prices
  await checkAlerts();

  console.log(`\n[${new Date().toISOString()}] Done. ${totalPrices} total prices stored.`);
}

fetchAndStorePrices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
