import type { ReactNode } from "react";

import { LiveCostPanel } from "@/components/calculator/live-cost-panel";
import type { CalculatorCostSummary } from "@/lib/types/calculator";

import { TypedVolumeProvider } from "./typed-volume";
import { WizardChrome } from "./wizard-chrome";

type WizardShellProps = {
  children: ReactNode;
  // Furthest step the user may open, read from the server by the layout.
  furthestStep: number;
  // Persisted totals for the live cost card; null when they could not be read.
  costSummary: CalculatorCostSummary | null;
};

export function WizardShell({
  children,
  furthestStep,
  costSummary,
}: WizardShellProps) {
  return (
    <main className="wizard-shell relative z-10 min-h-screen">
      <div className="mx-auto max-w-7xl space-y-4 px-6 py-5">
        <WizardChrome furthestStep={furthestStep} />

        {/* Each step renders only its own card (with its StepHeader inside);
            the live cost card beside it belongs to the shell, so it is the
            same on every step. */}
        <TypedVolumeProvider>
          <div className="grid grid-cols-1 items-start gap-6 pt-2 lg:grid-cols-[2fr_1fr]">
            {children}
            <LiveCostPanel costSummary={costSummary} />
          </div>
        </TypedVolumeProvider>
      </div>
    </main>
  );
}
