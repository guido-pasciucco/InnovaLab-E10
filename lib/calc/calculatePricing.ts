import Decimal from "decimal.js";

// Pure pricing for wizard step 6 (docs/producto/05-Motor de cálculo, §11-12).
// The margin is measured on the selling price, not on the cost:
//
//   suggestedPrice   = unitCost / (1 - margin)
//   contributionUnit = suggestedPrice - variableUnit
//   estimatedProfit  = contributionUnit × volume - totalFixed
//
// The margin convention is still a pending business decision
// (docs/decisiones/pendientes/negocio/02-convencion-de-margen.md); "on the
// selling price" is the one the step 6 copy explains to the user.
//
// Like calculateCostTotals, money stays a Decimal until it leaves the function
// and each returned amount is rounded once, from full precision, with
// ROUND_HALF_UP to 2 decimals. Rounding the price before multiplying it by the
// volume would drift the profit by cents.

const FINAL_MONEY_DECIMALS = 2;
const FINAL_MONEY_ROUNDING = Decimal.ROUND_HALF_UP;
const HUNDRED = new Decimal(100);

export type MoneyString = string;

export type PricingInput = {
  // Total cost per unit (fixed share + variable), as a decimal string.
  unitCost: string;
  variableUnit: string;
  totalFixed: string;
  volume: number;
  // Expected margin on the selling price, in percent: "30" means 30 %.
  marginPct: string;
};

export type PricingErrorCode = "INVALID_MARGIN" | "INVALID_VOLUME" | "INVALID_AMOUNT";

type PricingSuccess = {
  ok: true;
  suggestedPrice: MoneyString;
  contributionUnit: MoneyString;
  estimatedProfit: MoneyString;
  // False when each sale does not leave anything to cover the fixed costs
  // (contribution ≤ 0): the caller shows a warning (motor §12).
  hasPositiveContribution: boolean;
};

type PricingFailure = { ok: false; code: PricingErrorCode };

export type PricingResult = PricingSuccess | PricingFailure;

function parseDecimal(raw: string): Decimal | undefined {
  try {
    const value = new Decimal(raw.trim());
    return value.isFinite() ? value : undefined;
  } catch {
    return undefined;
  }
}

function asMoney(value: Decimal): MoneyString {
  return value.toFixed(FINAL_MONEY_DECIMALS, FINAL_MONEY_ROUNDING);
}

export function calculatePricing(input: PricingInput): PricingResult {
  // A margin of 100 % or more has no price: the divisor is zero or negative.
  const margin = parseDecimal(input.marginPct);
  if (margin === undefined || margin.lt(0) || margin.gte(HUNDRED)) {
    return { ok: false, code: "INVALID_MARGIN" };
  }

  if (!Number.isInteger(input.volume) || input.volume <= 0) {
    return { ok: false, code: "INVALID_VOLUME" };
  }

  const unitCost = parseDecimal(input.unitCost);
  const variableUnit = parseDecimal(input.variableUnit);
  const totalFixed = parseDecimal(input.totalFixed);
  if (unitCost === undefined || variableUnit === undefined || totalFixed === undefined) {
    return { ok: false, code: "INVALID_AMOUNT" };
  }

  const price = unitCost.div(new Decimal(1).minus(margin.div(HUNDRED)));
  const contribution = price.minus(variableUnit);
  const profit = contribution.times(input.volume).minus(totalFixed);

  return {
    ok: true,
    suggestedPrice: asMoney(price),
    contributionUnit: asMoney(contribution),
    estimatedProfit: asMoney(profit),
    hasPositiveContribution: contribution.gt(0),
  };
}

// The markup on cost that yields the same price as `marginPct` on the selling
// price: markup = margin / (100 - margin). Shown next to the margin so a user
// who thinks "I add X % to my cost" sees why the price is higher than that.
// Percent with 1 decimal ("42.9"), or null when the margin has no price.
export function markupFromMargin(marginPct: string): string | null {
  const margin = parseDecimal(marginPct);
  if (margin === undefined || margin.lt(0) || margin.gte(HUNDRED)) return null;

  return margin.div(HUNDRED.minus(margin)).times(HUNDRED).toFixed(1, Decimal.ROUND_HALF_UP);
}
