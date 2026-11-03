import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { getCalculatorProgressService } from "@/lib/services/calculator";
import { StepHeader } from "@/components/calculator/wizard/step-header";
import { StepNav } from "@/components/calculator/wizard/step-nav";

export const metadata: Metadata = {
  title: "Comparar escenarios",
};

export default async function Paso7Page() {
  const user = await requireUser();
  const { currentStep } = await getCalculatorProgressService(user.id);

  // Not reachable yet: send the user to the furthest step they may open.
  if (currentStep < 7) redirect(`/paso-${currentStep}`);

  return (
    <section className="rounded-[32px] bg-surface/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
      <StepHeader currentStep={7} title="Comparar escenarios" />
      <StepNav previous="/paso-6" />
    </section>
  );
}
