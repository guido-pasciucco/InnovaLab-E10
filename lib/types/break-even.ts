// Contract of the break-even service (#246). The service lives in
// lib/services/break-even.ts, reads the pricing service (#312, contract in
// ./pricing.ts) and feeds calculatePortfolioBreakEven; it never repeats a
// formula. Nothing is persisted: every read recomputes from the live catalog.
//
// Which products take part:
//   - capacity null or 0 → excluded with "NO_CAPACITY"; the rest still compute.
//   - capacity > 0 but no variable cost or no price → the mix is incomplete,
//     because the capacities define the mix: dropping that product would change
//     every other quota. Status "incomplete", no figures, and the product is
//     listed with "NO_VARIABLE_COST" or "NO_PRICE".
//
// Number formats are the engine's: money 2 decimals, percentages and units
// 4 decimals, the contribution ratio 6 decimals. Whole units are rounded up
// with Decimal.ROUND_CEIL, since a fraction of a product cannot be sold.

import type { VerifiedUserId } from "@/lib/services/auth";
import type { PortfolioProduct, PortfolioTotals } from "@/lib/calc/calculatePortfolioBreakEven";

import type { GetPricing } from "./pricing";

export type BreakEvenStatus =
  // Figures available for every product in the mix.
  | "ready"
  // The catalog has no products.
  | "no_products"
  // No product has a capacity > 0.
  | "no_capacity"
  // The period has no expenses.
  | "no_expenses"
  // No product in the mix has a price (no markup loaded anywhere).
  | "no_prices"
  // Some product with capacity > 0 has no variable cost or no price.
  | "incomplete"
  // The weighted contribution is ≤ 0: no break-even is reachable.
  | "no_break_even";

export type BreakEvenExclusionReason = "NO_CAPACITY" | "NO_VARIABLE_COST" | "NO_PRICE";

export type BreakEvenExcludedProduct = {
  productId: string;
  name: string;
  reason: BreakEvenExclusionReason;
};

// The whole quota ("38") comes from the engine as breakEvenUnitsWhole, rounded
// up from the unrounded quota; the exact value is breakEvenUnits.
export type BreakEvenRow = PortfolioProduct & {
  // Price ≤ variable cost (contribution ≤ 0): the row is shown with a warning.
  hasNegativeContribution: boolean;
};

export type BreakEven = {
  // Period of the expenses ("2026-11").
  period: string;
  status: BreakEvenStatus;
  totalExpenses: string;
  // Present only when status is "ready"; empty or null otherwise.
  rows: BreakEvenRow[];
  totals: PortfolioTotals | null;
  // Products left out or blocking the mix, with the reason, in every status.
  excluded: BreakEvenExcludedProduct[];
  hasNegativeContribution: boolean;
};

// The pricing reader is injected so the service is unit-tested with a fake
// Pricing (vi.fn) before #312 is merged; the page passes getPricingService.
export type GetBreakEven = (
  userId: VerifiedUserId,
  deps: { getPricing: GetPricing },
) => Promise<BreakEven>;
