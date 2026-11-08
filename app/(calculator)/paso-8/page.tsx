import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { getCalculatorProgressService } from "@/lib/services/calculator";
import { getCalculatorSummaryService } from "@/lib/services/summary";
import { SummaryStep } from "@/components/calculator/summary-step";
import type { CalculatorSummary } from "@/lib/types/calculator";

export const metadata: Metadata = {
  title: "Resumen y compartir",
};

export default async function Paso8Page() {
  const user = await requireUser();
  const { currentStep } = await getCalculatorProgressService(user.id);

  // Not reachable yet: send the user to the furthest step they may open.
  if (currentStep < 8) redirect(`/paso-${currentStep}`);

  // Same fallback as steps 5 to 7: persisted costs the engine rejects must
  // not take the step down; it explains that the costs are missing instead.
  const summary = await getCalculatorSummaryService(user.id).catch((error: unknown) => {
    console.error("[calculator] summary failed", error);
    return null;
  });

  // The progress says step 8 is open, so a missing draft means the user has
  // to save step 1 again before there is anything to summarize.
  if (summary !== null && summary.calculationId === null) redirect("/paso-1");

  return <SummaryStep summary={summary ?? UNAVAILABLE} />;
}

const UNAVAILABLE: CalculatorSummary = {
  calculationId: null,
  status: "missing-costs",
  productName: null,
  period: null,
  volume: null,
  unitCost: null,
  suggestedPrice: null,
  realMarginPct: null,
  estimatedProfit: null,
  breakEvenUnits: null,
  breakEvenSales: null,
  currency: "ARS",
};
