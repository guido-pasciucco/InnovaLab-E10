import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth/require-user";
import { getCalculatorProgressService } from "@/lib/services/calculator";
import { WizardShell } from "@/components/calculator/wizard/wizard-shell";

type CalculatorLayoutProps = {
  children: ReactNode;
};

export default async function CalculatorLayout({
  children,
}: CalculatorLayoutProps) {
  const user = await requireUser();
  const { currentStep } = await getCalculatorProgressService(user.id);

  return <WizardShell furthestStep={currentStep}>{children}</WizardShell>;
}
