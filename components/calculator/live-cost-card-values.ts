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
// not depend on the volume, so it stays. `null` ("no costs yet") becomes
// `undefined`, which the card renders as "—".
export function toLiveCostCardValues(
  summary: CalculatorCostSummary | null,
  liveVolume: number | undefined,
): LiveCostCardValues {
  const volumeIsPersisted =
    summary !== null && liveVolume !== undefined && summary.volume === liveVolume;

  return {
    volume: liveVolume,
    fixedCosts: summary?.totalFixed ?? undefined,
    unitCost: volumeIsPersisted ? (summary.unitCost ?? undefined) : undefined,
    variablePerUnit: volumeIsPersisted
      ? (summary.variableUnit ?? undefined)
      : undefined,
  };
}
