import {
  addVariableCostLine,
  continueToStep4,
  removeVariableCostLine,
  renameVariableCostLine,
  updateVariableCostAmount,
  updateVariableCostYield,
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
  updateYield: updateVariableCostYield,
};

type VariableCostsStepProps = {
  lines: readonly CostLine[];
  // Variable cost per product unit: Σ amount / yield.
  totalVariable: string;
  // The product unit of the setup, free text such as "caja" or "kilo".
  unit: string;
};

// The lines and their sum come from the server on every render, so the step
// has no client state of its own: each save revalidates the page.
export function VariableCostsStep({ lines, totalVariable, unit }: VariableCostsStepProps) {
  return (
    <section className="rounded-[32px] bg-surface/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6 short:sm:p-4">
      <StepHeader
        currentStep={3}
        title="Costos variables por unidad"
        description="Cargá lo que pagás en cada compra (por ejemplo, un rollo de envases) y para cuántas unidades de tu producto te rinde."
      />

      <div className="mt-4">
        <CostLinesTable
          lines={lines}
          total={totalVariable}
          actions={VARIABLE_COST_ACTIONS}
          listLabel="Costos variables por unidad"
          subtotalLabel="Variable por unidad"
          amountLabel="Importe de compra"
          yieldUnit={unit}
        />
      </div>

      <StepNav previous="/paso-2" nextAction={continueToStep4} />
    </section>
  );
}
