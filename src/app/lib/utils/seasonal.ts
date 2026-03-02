import { SeasonalEvent } from "@/app/types";

/**
 * Seasonal pricing knowledge base.
 * This is the RAG "lite" approach — structured data that gets injected
 * into LLM context when making buy/wait recommendations.
 *
 * Start with manually curated data, later supplement with computed trends.
 */
const SEASONAL_EVENTS: Omit<SeasonalEvent, "daysUntil">[] = [
  // ─── Major Sales Events ────────────────────────────
  { event: "New Year Sales", typicalMonth: 1, avgDiscountPct: 15, category: "general" },
  { event: "Presidents Day", typicalMonth: 2, avgDiscountPct: 20, category: "appliances" },
  { event: "Presidents Day", typicalMonth: 2, avgDiscountPct: 15, category: "electronics" },
  { event: "Spring Sale", typicalMonth: 3, avgDiscountPct: 10, category: "general" },
  { event: "Memorial Day", typicalMonth: 5, avgDiscountPct: 20, category: "appliances" },
  { event: "Memorial Day", typicalMonth: 5, avgDiscountPct: 15, category: "electronics" },
  { event: "Amazon Prime Day", typicalMonth: 7, avgDiscountPct: 25, category: "electronics" },
  { event: "Amazon Prime Day", typicalMonth: 7, avgDiscountPct: 20, category: "headphones" },
  { event: "Amazon Prime Day", typicalMonth: 7, avgDiscountPct: 22, category: "laptops" },
  { event: "Back to School", typicalMonth: 8, avgDiscountPct: 18, category: "laptops" },
  { event: "Back to School", typicalMonth: 8, avgDiscountPct: 15, category: "electronics" },
  { event: "Labor Day", typicalMonth: 9, avgDiscountPct: 20, category: "appliances" },
  { event: "Amazon Prime Big Deal Days", typicalMonth: 10, avgDiscountPct: 22, category: "electronics" },
  { event: "Black Friday", typicalMonth: 11, avgDiscountPct: 30, category: "electronics" },
  { event: "Black Friday", typicalMonth: 11, avgDiscountPct: 35, category: "tvs" },
  { event: "Black Friday", typicalMonth: 11, avgDiscountPct: 25, category: "headphones" },
  { event: "Black Friday", typicalMonth: 11, avgDiscountPct: 28, category: "laptops" },
  { event: "Black Friday", typicalMonth: 11, avgDiscountPct: 30, category: "appliances" },
  { event: "Black Friday", typicalMonth: 11, avgDiscountPct: 25, category: "general" },
  { event: "Cyber Monday", typicalMonth: 12, avgDiscountPct: 28, category: "electronics" },
  { event: "Cyber Monday", typicalMonth: 12, avgDiscountPct: 25, category: "laptops" },
  { event: "Holiday Sales", typicalMonth: 12, avgDiscountPct: 20, category: "general" },

  // ─── Category-Specific ─────────────────────────────
  { event: "CES New Model Season", typicalMonth: 1, avgDiscountPct: 15, category: "tvs" },
  { event: "Apple Event (iPhone)", typicalMonth: 9, avgDiscountPct: 10, category: "phones" },
  { event: "Super Bowl TV Sales", typicalMonth: 2, avgDiscountPct: 20, category: "tvs" },
];

/**
 * Get upcoming seasonal events for a given category.
 * Returns events sorted by how soon they occur.
 */
export function getUpcomingSales(category: string): SeasonalEvent[] {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const matchingEvents = SEASONAL_EVENTS.filter(
    (e) => e.category === category || e.category === "general"
  );

  return matchingEvents
    .map((event) => {
      let monthsUntil = event.typicalMonth - currentMonth;
      if (monthsUntil < 0) monthsUntil += 12;
      if (monthsUntil === 0 && currentDay > 20) monthsUntil = 12;

      const daysUntil = monthsUntil * 30;

      return { ...event, daysUntil };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Formats seasonal data as context for the LLM advisor.
 */
export function formatSeasonalContext(category: string): string {
  const events = getUpcomingSales(category);

  if (events.length === 0) {
    return "No seasonal sale data available for this category.";
  }

  const lines = events.slice(0, 5).map((e) => {
    const monthName = new Date(2024, e.typicalMonth - 1).toLocaleString("en", { month: "long" });
    return `- ${e.event} (${monthName}): ~${e.avgDiscountPct}% off, ~${e.daysUntil} days away`;
  });

  return `Upcoming sales for "${category}":\n${lines.join("\n")}`;
}
