import type { ReactNode } from "react";
import { WizardHeader } from "./wizard-header";
import { WizardProgress } from "./wizard-progress";
import { StepHeader } from "./step-header";

type WizardShellProps = {
  children: ReactNode;
  currentStep: number;
  completedSteps: number[];
  title: string;
  description?: string;
};

export function WizardShell({
  children,
  currentStep,
  completedSteps,
  title,
  description,
}: WizardShellProps) {
  return (
    <main className="wizard-shell min-h-screen">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <WizardHeader currentStep={currentStep} />

        <WizardProgress
          currentStep={currentStep}
          completedSteps={completedSteps}
        />

        {/* The step content brings its own columns: the form card and the
            live cost card are direct grid items, so the step header spans both. */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="lg:col-span-2">
            <StepHeader
              currentStep={currentStep}
              title={title}
              description={description}
            />
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}
