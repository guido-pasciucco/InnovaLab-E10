import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import {
  getCalculatorCostSummaryService,
  getCalculatorProgressService,
} from "@/lib/services/calculator";
import { getCalculatorPricingInputsService } from "@/lib/services/pricing";
import { PricingStep } from "@/components/calculator/pricing-step";

export default async function Paso5Page() {
  const user = await requireUser();
  const { currentStep } = await getCalculatorProgressService(user.id);

  // Not reachable yet: send the user to the furthest step they may open.
  if (currentStep < 5) redirect(`/paso-${currentStep}`);

  const [pricing, costSummary] = await Promise.all([
    getCalculatorPricingInputsService(user.id),
    // Same fallback as the layout's live card: persisted costs the engine
    // rejects must not take the step down; the cards show "—" instead.
    getCalculatorCostSummaryService(user.id).catch((error: unknown) => {
      console.error("[calculator] cost summary failed", error);
      return null;
    }),
  ]);

  // The progress says step 5 is open, so a missing draft means the user has
  // to save step 1 again before there is a cost to price.
  if (pricing.calculationId === null) redirect("/paso-1");

  return (
    <PricingStep
      costs={
        costSummary && {
          unitCost: costSummary.unitCost,
          variableUnit: costSummary.variableUnit,
          totalFixed: costSummary.totalFixed,
          volume: costSummary.volume,
        }
      }
      savedMargin={pricing.expectedMarginPct}
    />
  );
}
