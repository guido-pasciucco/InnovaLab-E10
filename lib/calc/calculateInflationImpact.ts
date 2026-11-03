import Decimal from "decimal.js";

import { calculatePricing } from "./calculatePricing";
import { realMarginPct } from "./compareScenarios";

// Pure inflation what-if for wizard step 7: the variable cost per unit rises
// by `increasePct` while the fixed costs and the volume stay. Two answers:
//
//   1. Keeping the current price (the base, priced with its margin):
//        newVariableUnit = variableUnit × (1 + increase)
//        newUnitCost     = unitCost + variableUnit × increase
//        newMargin       = (price - newUnitCost) / price
//        newProfit       = (price - newVariableUnit) × volume - totalFixed
//   2. The price that keeps the base margin: newUnitCost / (1 - margin).
//
// Both profits come from calculatePricing with the base unit cost, so the price
// stays the unrounded step 5 price and the profits match step 5 to the cent.
// The increase is a what-if typed on the client and never persisted.

const FINAL_MONEY_DECIMALS = 2;
const FINAL_MONEY_ROUNDING = Decimal.ROUND_HALF_UP;
const HUNDRED = new Decimal(100);

export type MoneyString = string;

export type InflationImpactInput = {
  totalFixed: string;
  variableUnit: string;
  unitCost: string;
  volume: number;
  // Base margin on the selling price, in percent ("30").
  marginPct: string;
  // Expected increase of the variable cost per unit, in percent ("10").
  increasePct: string;
};

export type InflationImpactErrorCode =
  | "INVALID_INCREASE"
  | "INVALID_MARGIN"
  | "INVALID_VOLUME"
  | "INVALID_AMOUNT";

type InflationImpactSuccess = {
  ok: true;
  currentPrice: MoneyString;
  // Percent with 2 decimals.
  currentMarginPct: string;
  currentProfit: MoneyString;
  newVariableUnit: MoneyString;
  newUnitCost: MoneyString;
  newMarginPct: string;
  newProfit: MoneyString;
  keepMarginPrice: MoneyString;
  // How much higher the price that keeps the margin is, in percent with 1
  // decimal ("6.1").
  keepMarginPriceChangePct: string;
};

type InflationImpactFailure = { ok: false; code: InflationImpactErrorCode };

export type InflationImpactResult = InflationImpactSuccess | InflationImpactFailure;

function parseDecimal(raw: string): Decimal | undefined {
  try {
    const value = new Decimal(raw.trim());
    return value.isFinite() ? value : undefined;
  } catch {
    return undefined;
  }
}

export function calculateInflationImpact(input: InflationImpactInput): InflationImpactResult {
  const increase = parseDecimal(input.increasePct);
  if (increase === undefined || increase.lt(0)) {
    return { ok: false, code: "INVALID_INCREASE" };
  }

  const current = calculatePricing({ ...input });
  if (!current.ok) return current;

  // calculatePricing already parsed these, so they are valid here.
  const variableUnit = new Decimal(input.variableUnit);
  const extraPerUnit = variableUnit.times(increase).div(HUNDRED);
  const newVariableUnit = variableUnit.plus(extraPerUnit);
  const newUnitCost = new Decimal(input.unitCost).plus(extraPerUnit);

  // Same price (from the base unit cost), higher variable cost.
  const atCurrentPrice = calculatePricing({ ...input, variableUnit: newVariableUnit.toString() });
  // Same margin, higher unit cost.
  const keepMargin = calculatePricing({ ...input, unitCost: newUnitCost.toString() });
  if (!atCurrentPrice.ok) return atCurrentPrice;
  if (!keepMargin.ok) return keepMargin;

  const currentPrice = new Decimal(current.suggestedPrice);
  // The price is positive whenever the unit cost is; a zero-cost base has no
  // margin to lose, so it reads as 0 %.
  const marginOf = (unitCost: string) =>
    realMarginPct(current.suggestedPrice, unitCost) ?? "0.00";
  const changePct = currentPrice.gt(0)
    ? new Decimal(keepMargin.suggestedPrice).div(currentPrice).minus(1).times(HUNDRED)
    : new Decimal(0);

  return {
    ok: true,
    currentPrice: current.suggestedPrice,
    currentMarginPct: marginOf(input.unitCost),
    currentProfit: current.estimatedProfit,
    newVariableUnit: newVariableUnit.toFixed(FINAL_MONEY_DECIMALS, FINAL_MONEY_ROUNDING),
    newUnitCost: newUnitCost.toFixed(FINAL_MONEY_DECIMALS, FINAL_MONEY_ROUNDING),
    newMarginPct: marginOf(newUnitCost.toFixed(FINAL_MONEY_DECIMALS, FINAL_MONEY_ROUNDING)),
    newProfit: atCurrentPrice.estimatedProfit,
    keepMarginPrice: keepMargin.suggestedPrice,
    keepMarginPriceChangePct: changePct.toFixed(1, FINAL_MONEY_ROUNDING),
  };
}
