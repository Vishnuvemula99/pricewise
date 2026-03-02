/**
 * Category detection from search queries.
 * Maps keywords to product categories for seasonal pricing data.
 */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  headphones: [
    "headphones", "earbuds", "earphones", "airpods", "wh-1000", "wf-1000",
    "beats", "bose", "sony wh", "sony wf", "galaxy buds", "ear",
  ],
  laptops: [
    "laptop", "macbook", "chromebook", "thinkpad", "notebook", "ultrabook",
    "surface laptop", "dell xps", "zenbook", "spectre",
  ],
  tvs: [
    "tv", "television", "oled", "qled", "roku tv", "fire tv", "smart tv",
    "lg c", "samsung q", "sony bravia",
  ],
  phones: [
    "phone", "iphone", "galaxy s", "pixel", "smartphone",
    "samsung galaxy", "oneplus",
  ],
  appliances: [
    "washer", "dryer", "dishwasher", "refrigerator", "fridge", "oven",
    "microwave", "vacuum", "dyson", "roomba", "air purifier",
    "instant pot", "blender", "coffee maker",
  ],
  gaming: [
    "ps5", "playstation", "xbox", "nintendo", "switch", "controller",
    "gaming", "console", "steam deck",
  ],
  tablets: [
    "ipad", "tablet", "surface pro", "galaxy tab", "fire tablet",
  ],
  cameras: [
    "camera", "dslr", "mirrorless", "gopro", "canon", "nikon",
    "sony a7", "fujifilm",
  ],
  monitors: [
    "monitor", "display", "ultrawide", "curved monitor",
  ],
  storage: [
    "ssd", "hard drive", "external drive", "usb drive", "flash drive",
    "micro sd", "memory card", "nas",
  ],
};

/**
 * Detect the product category from a search query.
 * Returns the best matching category or "electronics" as fallback.
 */
export function detectCategory(query: string): string {
  const lower = query.toLowerCase();

  let bestMatch = { category: "electronics", score: 0 };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        const score = keyword.length; // longer match = more specific
        if (score > bestMatch.score) {
          bestMatch = { category, score };
        }
      }
    }
  }

  return bestMatch.category;
}

/**
 * Get display name for a category.
 */
export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    headphones: "Headphones & Audio",
    laptops: "Laptops",
    tvs: "TVs & Displays",
    phones: "Phones",
    appliances: "Home Appliances",
    gaming: "Gaming",
    tablets: "Tablets",
    cameras: "Cameras",
    monitors: "Monitors",
    storage: "Storage",
    electronics: "Electronics",
    general: "General",
  };
  return names[category] || "Electronics";
}
