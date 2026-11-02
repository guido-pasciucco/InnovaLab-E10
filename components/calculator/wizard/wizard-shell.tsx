import type { ReactNode } from "react";
import { WizardChrome } from "./wizard-chrome";

type WizardShellProps = {
  children: ReactNode;
  // Furthest step the user may open, read from the server by the layout.
  furthestStep: number;
};

export function WizardShell({ children, furthestStep }: WizardShellProps) {
  return (
    <main className="wizard-shell relative z-10 min-h-screen">
      <div className="mx-auto max-w-7xl space-y-4 px-6 py-5">
        <WizardChrome furthestStep={furthestStep} />

        {/* Each step brings its own columns (form card + live cost card) as
            direct grid items, and renders its own StepHeader inside its card. */}
        <div className="grid grid-cols-1 items-start gap-6 pt-2 lg:grid-cols-[2fr_1fr]">
          {children}
        </div>
      </div>
    </main>
  );
}
