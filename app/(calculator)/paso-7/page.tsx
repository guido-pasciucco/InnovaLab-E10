import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { getCalculatorProgressService } from "@/lib/services/calculator";
import { getScenarioComparisonService } from "@/lib/services/scenarios";
import { ScenariosStep } from "@/components/calculator/scenarios-step";

export const metadata: Metadata = {
  title: "Comparar escenarios",
};

export default async function Paso7Page() {
  const user = await requireUser();
  const { currentStep } = await getCalculatorProgressService(user.id);

  // Not reachable yet: send the user to the furthest step they may open.
  if (currentStep < 7) redirect(`/paso-${currentStep}`);

  // Same fallback as steps 5 and 6: persisted costs the engine rejects must
  // not take the step down; it explains that the costs are missing instead.
  const view = await getScenarioComparisonService(user.id).catch((error: unknown) => {
    console.error("[calculator] scenario comparison failed", error);
    return null;
  });

  // The progress says step 7 is open, so a missing draft means the user has
  // to save step 1 again before there is anything to compare.
  if (view !== null && view.calculationId === null) redirect("/paso-1");

  return (
    <ScenariosStep
      scenarios={view?.scenarios ?? []}
      comparison={view?.comparison ?? null}
      inputs={view?.inputs ?? null}
    />
  );
}
