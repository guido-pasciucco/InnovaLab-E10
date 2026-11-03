import type { CalculatorCostSummary } from "@/lib/types/calculator";

export type LiveCostCardValues = {
  unitCost?: string;
  fixedCosts?: string;
  variablePerUnit?: string;
  volume?: number;
};

// Maps the persisted cost summary to the card props. The card mirrors the
// volume being typed, but `unitCost` includes fixed costs divided by the
// persisted volume: when the two differ it is stale, so it shows "—" instead
// of mixing a new volume with the old division. `variableUnit` comes from each
// purchase and its yield, and `totalFixed` is a period amount: neither depends
// on the volume, so both stay.
// Per-unit amounts also wait for the first variable cost: with fixed costs
// alone the unit cost is incomplete, so the card shows dashes (the service
// reports "0.00" for a category with no lines). `null` ("no costs yet") becomes
// `undefined`, which the card renders as "—".
export function toLiveCostCardValues(
  summary: CalculatorCostSummary | null,
  liveVolume: number | undefined,
): LiveCostCardValues {
  const hasVariableCosts =
    summary !== null &&
    summary.variableUnit !== null &&
    summary.variableUnit !== "0.00";
  const unitCostIsCurrent =
    hasVariableCosts && liveVolume !== undefined && summary.volume === liveVolume;

  return {
    volume: liveVolume,
    fixedCosts: summary?.totalFixed ?? undefined,
    unitCost: unitCostIsCurrent ? (summary.unitCost ?? undefined) : undefined,
    variablePerUnit: hasVariableCosts
      ? (summary.variableUnit ?? undefined)
      : undefined,
  };
}
