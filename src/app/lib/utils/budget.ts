import { AffordabilityResult } from "@/app/types";

interface BudgetInput {
  productName: string;
  price: number;
  monthlyIncome: number;
  savingsRate?: number; // 0-1, defaults to 0.2 (20%)
}

/**
 * Work-time constants:
 * - 160 hours/month (40 hrs/week × 4 weeks)
 * - 8 hours/day
 * - 5 days/week (work days only)
 * - 4 work weeks/month (20 work days)
 */
const WORK_HOURS_PER_MONTH = 160;
const WORK_HOURS_PER_DAY = 8;
const WORK_DAYS_PER_WEEK = 5;

/**
 * Calculates how affordable a product is based on income,
 * expressed in real work-time: hours, days, or weeks of work.
 *
 * Example: $6,400/mo income → $40/hr
 *   - $80 product = 2 hours of work
 *   - $320 product = 1 day of work
 *   - $6,400 product = 4 weeks of work
 */
export function calculateAffordability(input: BudgetInput): AffordabilityResult {
  const { productName, price, monthlyIncome, savingsRate = 0.2 } = input;

  if (price <= 0) throw new Error("Price must be positive");
  if (monthlyIncome <= 0) throw new Error("Monthly income must be positive");
  if (savingsRate < 0 || savingsRate > 1) throw new Error("Savings rate must be between 0 and 1");

  // Savings-based calculations
  const monthlySavingsAmount = monthlyIncome * savingsRate;
  const weeklySavingsAmount = monthlySavingsAmount / 4.33;
  const monthsToAfford = price / monthlySavingsAmount;
  const weeksToAfford = price / weeklySavingsAmount;
  const percentOfMonthlyIncome = (price / monthlyIncome) * 100;

  // Work-time calculations
  const hourlyRate = monthlyIncome / WORK_HOURS_PER_MONTH;
  const workHoursNeeded = price / hourlyRate;
  const workDaysNeeded = workHoursNeeded / WORK_HOURS_PER_DAY;
  const workWeeksNeeded = workDaysNeeded / WORK_DAYS_PER_WEEK;

  // Human-readable work time
  const workTimeDisplay = formatWorkTime(workHoursNeeded, workDaysNeeded, workWeeksNeeded);

  const affordabilityTier = getAffordabilityTier(percentOfMonthlyIncome);
  const suggestion = generateSuggestion(
    productName,
    affordabilityTier,
    price,
    workTimeDisplay,
    hourlyRate
  );

  return {
    productName,
    price,
    monthlyIncome,
    monthlySavingsRate: savingsRate,
    monthlySavingsAmount: Math.round(monthlySavingsAmount * 100) / 100,
    weeksToAfford: Math.round(weeksToAfford * 10) / 10,
    monthsToAfford: Math.round(monthsToAfford * 10) / 10,
    percentOfMonthlyIncome: Math.round(percentOfMonthlyIncome * 10) / 10,
    affordabilityTier,
    suggestion,
    // Work-time fields
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    workHoursNeeded: Math.round(workHoursNeeded * 10) / 10,
    workDaysNeeded: Math.round(workDaysNeeded * 10) / 10,
    workWeeksNeeded: Math.round(workWeeksNeeded * 10) / 10,
    workTimeDisplay,
  };
}

/**
 * Format work-time into the most natural unit:
 * - Under 8 hours → show hours (e.g., "2 hours")
 * - Under 5 days → show days + hours (e.g., "1 day, 4 hours")
 * - Under 8 weeks → show weeks + days (e.g., "2 weeks, 3 days")
 * - Above that → show months (e.g., "3 months")
 */
function formatWorkTime(hours: number, days: number, weeks: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins} minute${mins !== 1 ? "s" : ""} of work`;
  }

  if (hours < WORK_HOURS_PER_DAY) {
    const h = Math.round(hours * 10) / 10;
    return `${h} hour${h !== 1 ? "s" : ""} of work`;
  }

  if (days < WORK_DAYS_PER_WEEK) {
    const wholeDays = Math.floor(days);
    const remainingHours = Math.round((days - wholeDays) * WORK_HOURS_PER_DAY);
    if (remainingHours > 0) {
      return `${wholeDays} day${wholeDays !== 1 ? "s" : ""}, ${remainingHours} hr${remainingHours !== 1 ? "s" : ""} of work`;
    }
    return `${wholeDays} day${wholeDays !== 1 ? "s" : ""} of work`;
  }

  if (weeks < 8) {
    const wholeWeeks = Math.floor(weeks);
    const remainingDays = Math.round((weeks - wholeWeeks) * WORK_DAYS_PER_WEEK);
    if (remainingDays > 0) {
      return `${wholeWeeks} week${wholeWeeks !== 1 ? "s" : ""}, ${remainingDays} day${remainingDays !== 1 ? "s" : ""} of work`;
    }
    return `${wholeWeeks} week${wholeWeeks !== 1 ? "s" : ""} of work`;
  }

  // Months
  const months = Math.round(weeks / 4.33 * 10) / 10;
  return `${months} month${months !== 1 ? "s" : ""} of work`;
}

function getAffordabilityTier(
  percentOfMonthlyIncome: number
): "easy" | "moderate" | "stretch" | "major" {
  if (percentOfMonthlyIncome <= 5) return "easy";
  if (percentOfMonthlyIncome <= 20) return "moderate";
  if (percentOfMonthlyIncome <= 50) return "stretch";
  return "major";
}

function generateSuggestion(
  productName: string,
  tier: string,
  price: number,
  workTime: string,
  hourlyRate: number,
): string {
  const rateStr = `$${hourlyRate.toFixed(0)}/hr`;

  switch (tier) {
    case "easy":
      return `At your rate of ${rateStr}, ${productName} ($${price}) costs you ${workTime}. Very affordable — go for it if you need it!`;
    case "moderate":
      return `${productName} ($${price}) = ${workTime} at ${rateStr}. Reasonable purchase — waiting for a sale would make it even better.`;
    case "stretch":
      return `${productName} ($${price}) = ${workTime} at ${rateStr}. This is a significant chunk of work — definitely shop for the best deal and consider waiting for sales.`;
    case "major":
      return `${productName} ($${price}) = ${workTime} at ${rateStr}. Major purchase — set up a savings goal and absolutely wait for the best deal.`;
    default:
      return `${productName} ($${price}) would cost you ${workTime} at ${rateStr}.`;
  }
}
