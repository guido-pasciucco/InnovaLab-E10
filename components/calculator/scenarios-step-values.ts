import { calculateInflationImpact } from "@/lib/calc/calculateInflationImpact";
import type { ScenarioComparison } from "@/lib/calc/compareScenarios";
import { formatARSCompact } from "@/lib/money/format";
import type {
  CalculatorScenario,
  ScenarioComparisonView,
  ScenarioComparisonInputs,
} from "@/lib/types/calculator";

// Maps the step 7 read model to what the comparison table and the inflation
// box show. The figures come from the pure engine (lib/calc); this module only
// formats them and words each delta against the base, so the delta is never
// told by color alone.

export type ScenarioCell = {
  value: string;
  // How the alternative compares with the base; null for the base itself and
  // when there is nothing to compare (no break-even on either side).
  delta: string | null;
};

export type ScenarioColumn = CalculatorScenario & {
  price: ScenarioCell;
  realMargin: ScenarioCell;
  estimatedProfit: ScenarioCell;
  breakEvenUnits: ScenarioCell;
};

export type ScenariosStepStatus = "ready" | "missing-inputs" | "invalid";

const SAME = "Igual que la base";
const NO_BREAK_EVEN = "Sin equilibrio";

// "30.00" -> "30", "25.70" -> "25,7", "-70.83" -> "-70,83".
function decimalLabel(value: string): string {
  const trimmed = value.includes(".") ? value.replace(/\.?0+$/, "") : value;
  return trimmed.replace(".", ",");
}

export function percentLabel(value: string): string {
  return `${decimalLabel(value)} %`;
}

function money(value: string): string {
  return formatARSCompact(value) || value;
}

function isZero(value: string): boolean {
  return /^-?0+(\.0+)?$/.test(value);
}

function direction(value: string): "más" | "menos" {
  return value.startsWith("-") ? "menos" : "más";
}

function unsigned(value: string): string {
  return value.replace(/^-/, "");
}

export function marginDeltaLabel(points: string): string {
  if (isZero(points)) return SAME;
  const amount = decimalLabel(unsigned(points));
  const noun = amount === "1" ? "punto" : "puntos";
  return `${amount} ${noun} ${direction(points)} que la base`;
}

export function profitDeltaLabel(profit: string): string {
  if (isZero(profit)) return SAME;
  return `${money(unsigned(profit))} ${direction(profit)} que la base`;
}

export function breakEvenDeltaLabel(units: string | null): string | null {
  if (units === null) return null;
  if (isZero(units)) return SAME;
  return `${unsigned(units)} ${direction(units)} que la base`;
}

function toColumn(scenario: CalculatorScenario, figures: ScenarioComparison): ScenarioColumn {
  const withDelta = (delta: string | null) => (scenario.isBase ? null : delta);

  return {
    ...scenario,
    price: { value: money(figures.price), delta: null },
    realMargin: {
      value: percentLabel(figures.realMarginPct),
      delta: withDelta(marginDeltaLabel(figures.delta.marginPoints)),
    },
    estimatedProfit: {
      value: money(figures.estimatedProfit),
      delta: withDelta(profitDeltaLabel(figures.delta.profit)),
    },
    breakEvenUnits: {
      value: figures.breakEvenUnits ?? NO_BREAK_EVEN,
      delta: withDelta(breakEvenDeltaLabel(figures.delta.breakEvenUnits)),
    },
  };
}

export type ScenariosStepValues =
  | { status: "ready"; columns: ScenarioColumn[] }
  | { status: Exclude<ScenariosStepStatus, "ready">; columns: null };

export function toScenariosStepValues(
  view: Pick<ScenarioComparisonView, "scenarios" | "comparison">,
): ScenariosStepValues {
  if (view.comparison === null) return { status: "missing-inputs", columns: null };
  if (!view.comparison.ok) return { status: "invalid", columns: null };

  const byId = new Map(view.comparison.scenarios.map((figures) => [figures.id, figures]));
  const columns: ScenarioColumn[] = [];
  for (const scenario of view.scenarios) {
    const figures = byId.get(scenario.id);
    if (figures) columns.push(toColumn(scenario, figures));
  }

  return { status: "ready", columns };
}

export type InflationValues =
  | { issue: string; summary: null; keepMargin: null }
  | { issue: null; summary: string; keepMargin: string };

const INVALID_INCREASE = "Escribí un porcentaje igual o mayor que 0.";

// The inflation what-if, typed on the client and never saved: the increase is
// read the Argentine way (comma as the decimal mark).
export function toInflationValues(
  inputs: ScenarioComparisonInputs,
  increaseText: string,
): InflationValues {
  const increasePct = increaseText.trim().replace(",", ".");
  const impact = calculateInflationImpact({ ...inputs, increasePct });
  if (!impact.ok) return { issue: INVALID_INCREASE, summary: null, keepMargin: null };

  return {
    issue: null,
    summary:
      `Si no actualizás el precio, tu margen baja de ${percentLabel(impact.currentMarginPct)} ` +
      `a ${percentLabel(impact.newMarginPct)} y tu ganancia, de ${money(impact.currentProfit)} ` +
      `a ${money(impact.newProfit)}.`,
    keepMargin:
      `Para mantener un ${percentLabel(inputs.marginPct)} tendrías que cobrar ` +
      `${money(impact.keepMarginPrice)} (+${decimalLabel(impact.keepMarginPriceChangePct)} %).`,
  };
}
