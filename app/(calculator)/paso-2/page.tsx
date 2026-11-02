import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { getCalculatorProgressService } from "@/lib/services/calculator";
import { FixedCostsStep } from "@/components/calculator/fixed-costs-step";

export default async function Paso2Page() {
  const user = await requireUser();
  const { currentStep } = await getCalculatorProgressService(user.id);

  // Not reachable yet: send the user to the furthest step they may open.
  if (currentStep < 2) redirect(`/paso-${currentStep}`);

  return <FixedCostsStep />;
}
