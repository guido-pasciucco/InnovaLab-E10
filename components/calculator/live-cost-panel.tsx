"use client";

import { LiveCostCard } from "@/components/calculator/live-cost-card";
import { toLiveCostCardValues } from "@/components/calculator/live-cost-card-values";
import { useTypedVolume } from "@/components/calculator/wizard/typed-volume";
import type { CalculatorCostSummary } from "@/lib/types/calculator";

type LiveCostPanelProps = {
  // Persisted totals read by the layout; null when they could not be read.
  costSummary: CalculatorCostSummary | null;
};

// The one live cost card of the wizard: every step shows the same data. In
// step 1 it follows the volume being typed; elsewhere it shows the saved one.
export function LiveCostPanel({ costSummary }: LiveCostPanelProps) {
  const typedVolume = useTypedVolume();
  const volume =
    typedVolume === null ? (costSummary?.volume ?? undefined) : typedVolume;

  return <LiveCostCard {...toLiveCostCardValues(costSummary, volume)} />;
}
