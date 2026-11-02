"use client";

import { usePathname } from "next/navigation";

import { WizardHeader } from "./wizard-header";
import { WizardProgress } from "./wizard-progress";
import { STEP_HREFS, stepFromPathname } from "./wizard-steps";

type WizardChromeProps = {
  // Furthest step the user may open, persisted on the server.
  furthestStep: number;
};

// Header and progress bar. The viewed step follows the route; the steps
// before the persisted progress are complete, and reachable ones are links so
// the user can go back and edit what they already filled in.
export function WizardChrome({ furthestStep }: WizardChromeProps) {
  const pathname = usePathname();
  const currentStep = stepFromPathname(pathname) ?? furthestStep;

  const completedSteps = Array.from(
    { length: furthestStep - 1 },
    (_, index) => index + 1,
  );
  const hrefs = Object.fromEntries(
    Object.entries(STEP_HREFS).filter(([step]) => Number(step) <= furthestStep),
  );

  return (
    <>
      <WizardHeader currentStep={currentStep} />
      <WizardProgress
        currentStep={currentStep}
        completedSteps={completedSteps}
        hrefs={hrefs}
      />
    </>
  );
}
