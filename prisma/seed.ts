/**
 * Database seed script — populates seasonal trends knowledge base.
 * Run via: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEASONAL_TRENDS = [
  { category: "electronics", event: "Black Friday", typicalMonth: 11, avgDiscountPct: 30, confidence: 0.95 },
  { category: "electronics", event: "Cyber Monday", typicalMonth: 12, avgDiscountPct: 28, confidence: 0.9 },
  { category: "electronics", event: "Amazon Prime Day", typicalMonth: 7, avgDiscountPct: 25, confidence: 0.85 },
  { category: "electronics", event: "Back to School", typicalMonth: 8, avgDiscountPct: 15, confidence: 0.7 },
  { category: "laptops", event: "Black Friday", typicalMonth: 11, avgDiscountPct: 28, confidence: 0.9 },
  { category: "laptops", event: "Back to School", typicalMonth: 8, avgDiscountPct: 18, confidence: 0.8 },
  { category: "laptops", event: "Amazon Prime Day", typicalMonth: 7, avgDiscountPct: 22, confidence: 0.8 },
  { category: "headphones", event: "Black Friday", typicalMonth: 11, avgDiscountPct: 25, confidence: 0.9 },
  { category: "headphones", event: "Amazon Prime Day", typicalMonth: 7, avgDiscountPct: 20, confidence: 0.85 },
  { category: "tvs", event: "Black Friday", typicalMonth: 11, avgDiscountPct: 35, confidence: 0.95 },
  { category: "tvs", event: "Super Bowl", typicalMonth: 2, avgDiscountPct: 20, confidence: 0.8 },
  { category: "tvs", event: "CES New Models", typicalMonth: 1, avgDiscountPct: 15, confidence: 0.7 },
  { category: "appliances", event: "Black Friday", typicalMonth: 11, avgDiscountPct: 30, confidence: 0.9 },
  { category: "appliances", event: "Presidents Day", typicalMonth: 2, avgDiscountPct: 20, confidence: 0.85 },
  { category: "appliances", event: "Memorial Day", typicalMonth: 5, avgDiscountPct: 20, confidence: 0.85 },
  { category: "appliances", event: "Labor Day", typicalMonth: 9, avgDiscountPct: 20, confidence: 0.85 },
  { category: "phones", event: "Apple Event", typicalMonth: 9, avgDiscountPct: 10, confidence: 0.7 },
  { category: "phones", event: "Black Friday", typicalMonth: 11, avgDiscountPct: 20, confidence: 0.8 },
];

async function seed() {
  console.log("Seeding seasonal trends...");

  for (const trend of SEASONAL_TRENDS) {
    await prisma.seasonalTrend.upsert({
      where: {
        category_event: {
          category: trend.category,
          event: trend.event,
        },
      },
      update: {
        avgDiscountPct: trend.avgDiscountPct,
        confidence: trend.confidence,
        typicalMonth: trend.typicalMonth,
      },
      create: {
        ...trend,
        source: "manual",
      },
    });
  }

  console.log(`✓ Seeded ${SEASONAL_TRENDS.length} seasonal trends.`);

  // Note: Budget profile is now created via the onboarding modal
  // when the user first opens the app.
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
