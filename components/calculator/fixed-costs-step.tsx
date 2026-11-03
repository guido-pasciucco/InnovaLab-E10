import {
  addFixedCostLine,
  continueToVariableCosts,
  removeFixedCostLine,
  renameFixedCostLine,
  updateFixedCostAmount,
} from "@/app/(calculator)/paso-2/actions";
import { CostLinesTable } from "@/components/calculator/cost-lines-table";
import type {
  CostLine,
  CostLineActions,
} from "@/components/calculator/cost-line-row-item";
import { StepHeader } from "@/components/calculator/wizard/step-header";
import { StepNav } from "@/components/calculator/wizard/step-nav";

const FIXED_COST_ACTIONS: CostLineActions = {
  add: addFixedCostLine,
  rename: renameFixedCostLine,
  updateAmount: updateFixedCostAmount,
  remove: removeFixedCostLine,
};

type FixedCostsStepProps = {
  lines: readonly CostLine[];
  totalFixed: string;
};

// The lines and their total come from the server on every render, so the step
// has no client state of its own: each save revalidates the page.
export function FixedCostsStep({ lines, totalFixed }: FixedCostsStepProps) {
  return (
    <>
      <section className="rounded-[32px] bg-surface/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
        <StepHeader
          currentStep={2}
          title="Costos fijos del mes"
          description="Lo pagás igual si vendés mucho o poco, por ejemplo el alquiler."
        />

        <div className="mt-4">
          <CostLinesTable
            lines={lines}
            total={totalFixed}
            actions={FIXED_COST_ACTIONS}
            listLabel="Costos fijos del mes"
            subtotalLabel="Subtotal fijos"
          />
        </div>

        <StepNav
          previous="/paso-1"
          nextAction={continueToVariableCosts}
        />
      </section>
    </>
  );
}
