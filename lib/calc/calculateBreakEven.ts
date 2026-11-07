import Decimal from "decimal.js";

// Pure break-even for wizard step 6 (docs/producto/05-Motor de cálculo).
// From the step 5 price and the persisted costs:
//
//   contributionUnit  = price - variableUnit
//   breakEvenUnits    = totalFixed / contributionUnit
//   breakEvenSales    = breakEvenUnits × price
//   revenueAtVolume   = price × volume
//   totalCostAtVolume = totalFixed + variableUnit × volume
//
// There is no break-even when each sale leaves nothing for the fixed costs
// (contribution ≤ 0). The units are returned twice: rounded up to a whole unit,
// because a fraction cannot be sold and rounding down would still leave a loss,
// and exact at 4 decimals, the scale the database keeps (numeric(14,4)).
//
// Like calculatePricing, values stay Decimals until they leave the function:
// the sales come from the unrounded units, rounded once with ROUND_HALF_UP.

const FINAL_MONEY_DECIMALS = 2;
const FINAL_MONEY_ROUNDING = Decimal.ROUND_HALF_UP;
const EXACT_UNITS_DECIMALS = 4;

export type MoneyString = string;

export type BreakEvenInput = {
  // Selling price per unit, as a decimal string (step 5 suggested price).
  price: string;
  variableUnit: string;
  totalFixed: string;
  volume: number;
};

export type BreakEvenErrorCode = "INVALID_VOLUME" | "INVALID_AMOUNT" | "NO_CONTRIBUTION";

type BreakEvenSuccess = {
  ok: true;
  contributionUnit: MoneyString;
  // Whole units to sell, rounded up ("96").
  breakEvenUnits: string;
  // Exact units at 4 decimals ("95.3192").
  breakEvenUnitsExact: string;
  breakEvenSales: MoneyString;
  revenueAtVolume: MoneyString;
  totalCostAtVolume: MoneyString;
};

type BreakEvenFailure = { ok: false; code: BreakEvenErrorCode };

export type BreakEvenResult = BreakEvenSuccess | BreakEvenFailure;

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

export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult {
  if (!Number.isInteger(input.volume) || input.volume <= 0) {
    return { ok: false, code: "INVALID_VOLUME" };
  }

  const price = parseDecimal(input.price);
  const variableUnit = parseDecimal(input.variableUnit);
  const totalFixed = parseDecimal(input.totalFixed);
  if (
    price === undefined ||
    variableUnit === undefined ||
    totalFixed === undefined ||
    price.lt(0) ||
    variableUnit.lt(0) ||
    totalFixed.lt(0)
  ) {
    return { ok: false, code: "INVALID_AMOUNT" };
  }

  const contribution = price.minus(variableUnit);
  if (contribution.lte(0)) {
    return { ok: false, code: "NO_CONTRIBUTION" };
  }

  const units = totalFixed.div(contribution);

  return {
    ok: true,
    contributionUnit: asMoney(contribution),
    breakEvenUnits: units.toFixed(0, Decimal.ROUND_CEIL),
    breakEvenUnitsExact: units.toFixed(EXACT_UNITS_DECIMALS, Decimal.ROUND_HALF_UP),
    breakEvenSales: asMoney(units.times(price)),
    revenueAtVolume: asMoney(price.times(input.volume)),
    totalCostAtVolume: asMoney(totalFixed.plus(variableUnit.times(input.volume))),
  };
}
