import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import {
  getCalculatorCostSummaryService,
  getCalculatorProgressService,
} from "@/lib/services/calculator";
import { getCalculatorPricingInputsService } from "@/lib/services/pricing";
import { BreakEvenStep } from "@/components/calculator/break-even-step";
import { toBreakEvenStepProps } from "@/components/calculator/break-even-step-values";

export const metadata: Metadata = {
  title: "Punto de equilibrio",
};

export default async function Paso6Page() {
  const user = await requireUser();
  const { currentStep } = await getCalculatorProgressService(user.id);

  // Not reachable yet: send the user to the furthest step they may open.
  if (currentStep < 6) redirect(`/paso-${currentStep}`);

  const [pricing, costSummary] = await Promise.all([
    getCalculatorPricingInputsService(user.id),
    // Same fallback as step 5: persisted costs the engine rejects must not
    // take the step down; it explains that the costs are missing instead.
    getCalculatorCostSummaryService(user.id).catch((error: unknown) => {
      console.error("[calculator] cost summary failed", error);
      return null;
    }),
  ]);

  // The progress says step 6 is open, so a missing draft means the user has
  // to save step 1 again before there is anything to break even on.
  if (pricing.calculationId === null) redirect("/paso-1");

  return <BreakEvenStep {...toBreakEvenStepProps(costSummary, pricing.expectedMarginPct)} />;
}
