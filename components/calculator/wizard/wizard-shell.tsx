import type { ReactNode } from "react";
import { WizardHeader } from "./wizard-header";
import { WizardProgress } from "./wizard-progress";
import { StepHeader } from "./step-header";
import { PlaceholderArt } from "./placeholder-art";

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

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <section className="space-y-8">
            <StepHeader
              currentStep={currentStep}
              title={title}
              description={description}
            />

            {children}
          </section>

          <aside
            aria-label="Costo unitario en vivo"
            data-testid="wizard-aside"
            className="hidden lg:block"
          >
            <PlaceholderArt />
          </aside>
        </div>
      </div>
    </main>
  );
}
