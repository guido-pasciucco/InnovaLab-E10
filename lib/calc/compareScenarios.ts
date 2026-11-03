import Decimal from "decimal.js";

import { calculateBreakEven } from "./calculateBreakEven";
import { calculateCostTotals } from "./calculateCostTotals";
import { calculatePricing } from "./calculatePricing";

// Pure scenario comparison for wizard step 7. The base is the calculation as
// entered in steps 1-6; each scenario may override the selling price, the
// volume, or both, and is measured against the base:
//
//   unitCost        = totalFixed / volume + variableUnit   (calculateCostTotals)
//   price           = manual price, else unitCost / (1 - margin)   (calculatePricing)
//   realMargin      = (price - unitCost) / price
//   estimatedProfit = (price - variableUnit) × volume - totalFixed
//   breakEvenUnits  = totalFixed / (price - variableUnit)  (calculateBreakEven)
//
// Every formula above lives in its own engine module; this one only chooses
// the inputs per scenario and subtracts the base. A price derived from the
// margin keeps the step 5 profit (computed from the unrounded price); a manual
// price is the amount the user charges, so it is used as typed. The break-even
// runs on the rounded price, as on step 6.
//
// The deltas subtract the rounded figures, so what the user reads adds up:
// a margin of 18.00 against 30.00 is 12 points less, never 11.99.

const FINAL_MONEY_DECIMALS = 2;
const FINAL_MONEY_ROUNDING = Decimal.ROUND_HALF_UP;
const MARGIN_DECIMALS = 2;
const HUNDRED = new Decimal(100);

export type MoneyString = string;

export type ScenarioBase = {
  totalFixed: string;
  variableUnit: string;
  // Persisted unit cost at the base volume (the cost summary's `unitCost`),
  // reused as-is so the base matches step 5 to the cent.
  unitCost: string;
  volume: number;
  // Expected margin on the selling price, in percent: "30" means 30 %.
  marginPct: string;
};

export type ScenarioOverride = {
  id: string;
  // Manual selling price per unit, or null to price with the base margin.
  priceOverride: string | null;
  // Units for the period, or null to keep the base volume.
  volumeOverride: number | null;
};

export type ScenarioFigures = {
  volume: number;
  unitCost: MoneyString;
  price: MoneyString;
  // Percent with 2 decimals ("18.00"); negative when the price is below cost.
  realMarginPct: string;
  estimatedProfit: MoneyString;
  // Whole units, or null when each sale does not cover its variable cost.
  breakEvenUnits: string | null;
};

export type ScenarioDelta = {
  // Percentage points against the base ("-12.00").
  marginPoints: string;
  profit: MoneyString;
  // Units against the base, or null when either side has no break-even.
  breakEvenUnits: string | null;
};

export type ScenarioComparison = ScenarioFigures & { id: string; delta: ScenarioDelta };

export type CompareScenariosErrorCode =
  | "INVALID_MARGIN"
  | "INVALID_VOLUME"
  | "INVALID_AMOUNT"
  | "INVALID_PRICE";

type CompareScenariosSuccess = {
  ok: true;
  base: ScenarioFigures;
  scenarios: ScenarioComparison[];
};

type CompareScenariosFailure = { ok: false; code: CompareScenariosErrorCode };

export type CompareScenariosResult = CompareScenariosSuccess | CompareScenariosFailure;

type FiguresResult = { ok: true; figures: ScenarioFigures } | CompareScenariosFailure;

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

// Margin on the selling price, in percent with 2 decimals, for a price the
// user charges. Null when the price is not a positive amount.
export function realMarginPct(price: string, unitCost: string): string | null {
  const charged = parseDecimal(price);
  const cost = parseDecimal(unitCost);
  if (charged === undefined || cost === undefined || charged.lte(0)) return null;

  return charged
    .minus(cost)
    .div(charged)
    .times(HUNDRED)
    .toFixed(MARGIN_DECIMALS, FINAL_MONEY_ROUNDING);
}

// Unit cost at another volume, from the period totals: one fixed line with the
// period amount and one variable line that yields a single unit.
function unitCostAt(base: ScenarioBase, volume: number): string | CompareScenariosErrorCode {
  const totals = calculateCostTotals({
    volume,
    lines: [
      {
        id: "fixed",
        behavior: "fixed",
        traceability: "direct",
        isOwnLabor: false,
        amount: base.totalFixed,
        yieldQuantity: "1",
      },
      {
        id: "variable",
        behavior: "variable",
        traceability: "direct",
        isOwnLabor: false,
        amount: base.variableUnit,
        yieldQuantity: "1",
      },
    ],
  });

  if (!totals.ok) return totals.code === "INVALID_VOLUME" ? "INVALID_VOLUME" : "INVALID_AMOUNT";
  return totals.unitario;
}

function figuresFor(base: ScenarioBase, override: Omit<ScenarioOverride, "id">): FiguresResult {
  const volume = override.volumeOverride ?? base.volume;
  if (!Number.isInteger(volume) || volume <= 0) {
    return { ok: false, code: "INVALID_VOLUME" };
  }

  let unitCost = base.unitCost;
  if (override.volumeOverride !== null && override.volumeOverride !== base.volume) {
    const recomputed = unitCostAt(base, volume);
    if (recomputed === "INVALID_VOLUME" || recomputed === "INVALID_AMOUNT") {
      return { ok: false, code: recomputed };
    }
    unitCost = recomputed;
  }

  let price: string;
  let estimatedProfit: string;

  // The margin is validated even with a manual price: the base always needs it.
  const pricing = calculatePricing({
    unitCost,
    variableUnit: base.variableUnit,
    totalFixed: base.totalFixed,
    volume,
    marginPct: base.marginPct,
  });
  if (!pricing.ok) return pricing;

  if (override.priceOverride === null) {
    price = pricing.suggestedPrice;
    estimatedProfit = pricing.estimatedProfit;
  } else {
    const manual = parseDecimal(override.priceOverride);
    if (manual === undefined || manual.lte(0)) {
      return { ok: false, code: "INVALID_PRICE" };
    }
    // calculatePricing already parsed these two, so they are valid here.
    const variableUnit = new Decimal(base.variableUnit);
    const totalFixed = new Decimal(base.totalFixed);
    price = asMoney(manual);
    estimatedProfit = asMoney(manual.minus(variableUnit).times(volume).minus(totalFixed));
  }

  const breakEven = calculateBreakEven({
    price,
    variableUnit: base.variableUnit,
    totalFixed: base.totalFixed,
    volume,
  });
  if (!breakEven.ok && breakEven.code !== "NO_CONTRIBUTION") {
    return { ok: false, code: breakEven.code };
  }

  return {
    ok: true,
    figures: {
      volume,
      unitCost,
      price,
      // The price is positive here, so the margin always exists.
      realMarginPct: realMarginPct(price, unitCost) ?? "0.00",
      estimatedProfit,
      breakEvenUnits: breakEven.ok ? breakEven.breakEvenUnits : null,
    },
  };
}

function deltaFrom(base: ScenarioFigures, scenario: ScenarioFigures): ScenarioDelta {
  return {
    marginPoints: new Decimal(scenario.realMarginPct)
      .minus(base.realMarginPct)
      .toFixed(MARGIN_DECIMALS),
    profit: asMoney(new Decimal(scenario.estimatedProfit).minus(base.estimatedProfit)),
    breakEvenUnits:
      scenario.breakEvenUnits === null || base.breakEvenUnits === null
        ? null
        : new Decimal(scenario.breakEvenUnits).minus(base.breakEvenUnits).toFixed(0),
  };
}

export function compareScenarios(
  base: ScenarioBase,
  scenarios: readonly ScenarioOverride[],
): CompareScenariosResult {
  const baseResult = figuresFor(base, { priceOverride: null, volumeOverride: null });
  if (!baseResult.ok) return baseResult;

  const compared: ScenarioComparison[] = [];
  for (const scenario of scenarios) {
    const result = figuresFor(base, scenario);
    if (!result.ok) return result;
    compared.push({
      id: scenario.id,
      ...result.figures,
      delta: deltaFrom(baseResult.figures, result.figures),
    });
  }

  return { ok: true, base: baseResult.figures, scenarios: compared };
}
