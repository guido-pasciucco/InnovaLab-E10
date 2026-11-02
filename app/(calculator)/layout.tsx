import type { ReactNode } from "react";
import { WizardShell } from "@/components/calculator/wizard/wizard-shell";

type CalculatorLayoutProps = {
  children: ReactNode;
};

export default function CalculatorLayout({ children }: CalculatorLayoutProps) {
  return (
    <WizardShell currentStep={1} completedSteps={[]}>
      {children}
    </WizardShell>
  );
}
