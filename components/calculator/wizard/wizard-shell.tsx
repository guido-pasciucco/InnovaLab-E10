import type { ReactNode } from "react";
import { WizardHeader } from "./wizard-header";
import { WizardProgress } from "./wizard-progress";

type WizardShellProps = {
  children: ReactNode;
  currentStep: number;
  completedSteps: number[];
};

export function WizardShell({
  children,
  currentStep,
  completedSteps,
}: WizardShellProps) {
  return (
    <main className="wizard-shell relative z-10 min-h-screen">
      <div className="mx-auto max-w-7xl space-y-4 px-6 py-5">
        <WizardHeader currentStep={currentStep} />

        <WizardProgress
          currentStep={currentStep}
          completedSteps={completedSteps}
        />

        {/* Each step brings its own columns (form card + live cost card) as
            direct grid items, and renders its own StepHeader inside its card. */}
        <div className="grid grid-cols-1 items-start gap-6 pt-2 lg:grid-cols-[2fr_1fr]">
          {children}
        </div>
      </div>
    </main>
  );
}
