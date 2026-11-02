import {
  addVariableCostLine,
  continueToStep4,
  removeVariableCostLine,
  renameVariableCostLine,
  updateVariableCostAmount,
} from "@/app/(calculator)/paso-3/actions";
import { CostLinesTable } from "@/components/calculator/cost-lines-table";
import type {
  CostLine,
  CostLineActions,
} from "@/components/calculator/cost-line-row-item";
import { StepHeader } from "@/components/calculator/wizard/step-header";
import { StepNav } from "@/components/calculator/wizard/step-nav";

const VARIABLE_COST_ACTIONS: CostLineActions = {
  add: addVariableCostLine,
  rename: renameVariableCostLine,
  updateAmount: updateVariableCostAmount,
  remove: removeVariableCostLine,
};

type VariableCostsStepProps = {
  lines: readonly CostLine[];
  totalVariable: string;
};

// The lines and their sum come from the server on every render, so the step
// has no client state of its own: each save revalidates the page.
export function VariableCostsStep({ lines, totalVariable }: VariableCostsStepProps) {
  return (
    <section className="rounded-[32px] bg-surface/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
      <StepHeader
        currentStep={3}
        title="Costos variables por unidad"
        description="Lo gastás cada vez que producís una unidad, por ejemplo el envase."
      />

      <div className="mt-4">
        <CostLinesTable
          lines={lines}
          total={totalVariable}
          actions={VARIABLE_COST_ACTIONS}
          listLabel="Costos variables por unidad"
          subtotalLabel="Variable por unidad"
        />
      </div>

      <StepNav previous="/paso-2" nextAction={continueToStep4} />
    </section>
  );
}
