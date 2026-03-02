// ─── Core Domain Types ───────────────────────────────────────

export interface PriceResult {
  retailer: string;
  retailerLogo?: string;
  price: number;
  currency: string;
  url: string;
  inStock: boolean;
  lastUpdated: Date;
}

export interface ProductSearchResult {
  name: string;
  category: string;
  imageUrl?: string;
  prices: PriceResult[];
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  retailerCount: number;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
  retailer: string;
}

export interface PriceTrend {
  direction: "rising" | "falling" | "stable";
  changePercent: number;
  period: string; // "30d", "90d", "1y"
  allTimeLow: number;
  allTimeHigh: number;
  currentVsAverage: "above" | "below" | "at";
}

// ─── Buy/Wait Recommendation ────────────────────────────────

export type Recommendation = "buy_now" | "wait" | "strong_wait" | "strong_buy";

export interface BuyWaitAdvice {
  recommendation: Recommendation;
  confidence: number; // 0-1
  reasoning: string;
  nextSaleEvent?: string;
  nextSaleDate?: string;
  estimatedSalePrice?: number;
  currentPrice: number;
  historicalLow: number;
}

// ─── Budget / Affordability ─────────────────────────────────

export interface AffordabilityResult {
  productName: string;
  price: number;
  monthlyIncome: number;
  monthlySavingsRate: number;
  monthlySavingsAmount: number;
  weeksToAfford: number;
  monthsToAfford: number;
  percentOfMonthlyIncome: number;
  affordabilityTier: "easy" | "moderate" | "stretch" | "major";
  suggestion: string;
  // Work-time affordability (based on 160 hrs/mo, 5-day work weeks)
  hourlyRate: number;
  workHoursNeeded: number;
  workDaysNeeded: number;
  workWeeksNeeded: number;
  workTimeDisplay: string; // Human-readable: "2 hours", "3 days", "4 weeks"
}

// ─── AI Advisor ─────────────────────────────────────────────

export interface AdvisorQuery {
  query: string;
  productName?: string;
  budget?: number;
}

export interface AdvisorResponse {
  answer: string;
  sources: string[];
  recommendation?: BuyWaitAdvice;
  affordability?: AffordabilityResult;
  priceComparison?: ProductSearchResult;
}

// ─── Seasonal Data ──────────────────────────────────────────

export interface SeasonalEvent {
  event: string;
  typicalMonth: number;
  avgDiscountPct: number;
  category: string;
  daysUntil: number;
}

// ─── API Response Wrappers ──────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ─── Fetcher Interface (Strategy Pattern) ───────────────────

export interface PriceFetcher {
  readonly name: string;
  readonly retailer: string;
  search(query: string): Promise<PriceResult[]>;
  getProduct(productId: string): Promise<PriceResult | null>;
  isAvailable(): Promise<boolean>;
}
