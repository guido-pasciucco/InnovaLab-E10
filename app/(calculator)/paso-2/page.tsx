import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { getCalculatorProgressService } from "@/lib/services/calculator";
import { StepHeader } from "@/components/calculator/wizard/step-header";

// Placeholder for calculator step 2 (pricing inputs go here). Already guarded
// and linked back to step 1 so the wizard flow works end to end.
export default async function Paso2Page() {
  const user = await requireUser();
  const { currentStep } = await getCalculatorProgressService(user.id);

  // Not reachable yet: send the user to the furthest step they may open.
  if (currentStep < 2) redirect(`/paso-${currentStep}`);

  return (
    <section className="rounded-[32px] bg-white/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6 lg:col-span-2">
      <StepHeader
        currentStep={2}
        title="Paso 2"
        description="Esta pantalla todavía no está disponible."
      />
      <Link
        href="/paso-1"
        className="mt-4 inline-block text-base font-semibold text-brand-green-700 underline"
      >
        Volver al paso 1
      </Link>
    </section>
  );
}
