import type { CalculatorCostSummary } from "@/lib/types/calculator";

export type LiveCostCardValues = {
  unitCost?: string;
  fixedCosts?: string;
  variablePerUnit?: string;
  volume?: number;
};

// Maps the persisted cost summary to the card props. The card mirrors the
// volume being typed, but `unitCost` and `variableUnit` were divided by the
// persisted volume: when the two differ those amounts are stale, so they show
// "—" instead of mixing a new volume with the old division. `totalFixed` does
// not depend on the volume, so it stays.
// Per-unit amounts also wait for the first variable cost: with fixed costs
// alone the unit cost is incomplete, so the card shows dashes (the service
// reports "0.00" for a category with no lines). `null` ("no costs yet") becomes
// `undefined`, which the card renders as "—".
export function toLiveCostCardValues(
  summary: CalculatorCostSummary | null,
  liveVolume: number | undefined,
): LiveCostCardValues {
  const perUnitIsCurrent =
    summary !== null &&
    liveVolume !== undefined &&
    summary.volume === liveVolume &&
    summary.variableUnit !== null &&
    summary.variableUnit !== "0.00";

  return {
    volume: liveVolume,
    fixedCosts: summary?.totalFixed ?? undefined,
    unitCost: perUnitIsCurrent ? (summary.unitCost ?? undefined) : undefined,
    variablePerUnit: perUnitIsCurrent
      ? (summary.variableUnit ?? undefined)
      : undefined,
  };
}
