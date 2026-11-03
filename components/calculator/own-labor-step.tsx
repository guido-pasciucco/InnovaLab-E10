import {
  addIndirectCostLine,
  continueToStep5,
  removeIndirectCostLine,
  renameIndirectCostLine,
  updateIndirectCostAmount,
} from "@/app/(calculator)/paso-4/actions";
import { CostLinesTable } from "@/components/calculator/cost-lines-table";
import type {
  CostLine,
  CostLineActions,
} from "@/components/calculator/cost-line-row-item";
import { OwnLaborInputs } from "@/components/calculator/own-labor-inputs";
import { UnitCostBox } from "@/components/calculator/unit-cost-box";
import { StepHeader } from "@/components/calculator/wizard/step-header";
import { StepNav } from "@/components/calculator/wizard/step-nav";
import type { OwnLabor } from "@/lib/services/own-labor";

const INDIRECT_COST_ACTIONS: CostLineActions = {
  add: addIndirectCostLine,
  rename: renameIndirectCostLine,
  updateAmount: updateIndirectCostAmount,
  remove: removeIndirectCostLine,
};

type OwnLaborStepProps = {
  ownLabor: OwnLabor | null;
  lines: readonly CostLine[];
  totalIndirect: string;
  unitCost: string | null;
};

// Everything comes from the server on every render, so the step has no client
// state of its own beyond the inputs being typed: each save revalidates the page.
export function OwnLaborStep({ ownLabor, lines, totalIndirect, unitCost }: OwnLaborStepProps) {
  return (
    <section className="rounded-[32px] bg-surface/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
      <StepHeader
        currentStep={4}
        title="Trabajo propio e indirectos"
        description="Tu tiempo también cuesta. Si no lo contás, tu precio queda por debajo de lo que necesitás."
      />

      <OwnLaborInputs
        hours={ownLabor?.hours ?? null}
        hourlyRate={ownLabor?.hourlyRate ?? null}
        amount={ownLabor?.amount ?? "0.00"}
      />

      <div className="mt-6">
        <CostLinesTable
          lines={lines}
          total={totalIndirect}
          actions={INDIRECT_COST_ACTIONS}
          listLabel="Costos indirectos"
          subtotalLabel="Subtotal indirectos"
        />
      </div>

      <UnitCostBox unitCost={unitCost} />

      <StepNav previous="/paso-3" nextAction={continueToStep5} />
    </section>
  );
}
