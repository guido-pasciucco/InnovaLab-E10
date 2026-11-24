// Contract of the pricing service (#312), shared with the break-even view
// (#246) so both can be built in parallel. The service lives in
// lib/services/pricing.ts and must return exactly this shape.
//
// Rule (D29, P-06): the user loads a markup on the total unit cost.
//
//   price        = unitCost × (1 + markupPercent / 100)
//   profitUnit   = price − unitCost
//   realMargin   = profitUnit ÷ price × 100
//
// The effective markup of a product is its own markup; without one, the
// business default; without both, there is no price. Nothing derived here is
// persisted: only the markups are saved, and every read recomputes the rest.
//
// Number formats (strings, dot as decimal separator, no thousands separator):
//   money       → 2 decimals ("9100.00")
//   percentages → 2 decimals for markups ("30.00"), 4 for the real margin
//                 ("23.0769"), the same precision the break-even engine uses.

import type { VerifiedUserId } from "@/lib/services/auth";
import type {
  CostDistributionStatus,
  VariableCostUnavailableCode,
} from "@/lib/services/cost-distribution";

// Where the effective markup of a row comes from.
export type MarkupSource = "product" | "business" | "none";

// Why a row has no price.
export type PricingUnavailableCode =
  // No total unit cost: no variable cost, or no capacity > 0 (see the cost
  // distribution row for the detail).
  | "NO_TOTAL_COST"
  // Neither the product nor the business has a markup.
  | "NO_MARKUP";

export type PricingRow = {
  productId: string;
  name: string;
  // Saved monthly capacity, or null when it was never loaded.
  capacity: number | null;
  // Variable cost of one unit, or null while the recipe cannot be costed.
  variableUnit: string | null;
  variableUnavailableCode: VariableCostUnavailableCode;
  // Variable + indirect per unit, taken as-is from getCostDistributionService.
  unitCost: string | null;
  // The product's own markup, null when it uses the business default.
  ownMarkupPercent: string | null;
  // The markup actually applied, null when markupSource is "none".
  markupPercent: string | null;
  markupSource: MarkupSource;
  // Null together, with unavailableCode set, when the price cannot be computed.
  price: string | null;
  profitUnit: string | null;
  realMarginPct: string | null;
  unavailableCode: PricingUnavailableCode | null;
};

export type Pricing = {
  // Period of the expenses used for the total cost ("2026-11").
  period: string;
  // Same status as the cost distribution: the price needs a total cost first.
  status: CostDistributionStatus;
  totalExpenses: string;
  defaultMarkupPercent: string | null;
  rows: PricingRow[];
};

// Signature of the read service. The break-even service receives it as a
// parameter so it can be tested with a fake before #312 is merged.
export type GetPricing = (userId: VerifiedUserId) => Promise<Pricing>;
