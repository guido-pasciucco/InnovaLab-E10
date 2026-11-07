import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth/require-user";
import {
  getCalculatorCostSummaryService,
  getCalculatorProgressService,
} from "@/lib/services/calculator";
import { WizardShell } from "@/components/calculator/wizard/wizard-shell";

type CalculatorLayoutProps = {
  children: ReactNode;
};

export default async function CalculatorLayout({
  children,
}: CalculatorLayoutProps) {
  const user = await requireUser();
  const [{ currentStep }, costSummary] = await Promise.all([
    getCalculatorProgressService(user.id),
    // The card is secondary: invalid persisted costs must not take a step
    // down, so a failed summary renders the card with "—" and is logged.
    getCalculatorCostSummaryService(user.id).catch((error: unknown) => {
      console.error("[calculator] cost summary failed", error);
      return null;
    }),
  ]);

  return (
    <WizardShell furthestStep={currentStep} costSummary={costSummary}>
      {children}
    </WizardShell>
  );
}
