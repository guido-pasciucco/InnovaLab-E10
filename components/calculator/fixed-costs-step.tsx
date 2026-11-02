import { FixedCostsTable } from "@/components/calculator/fixed-costs-table";
import type { FixedCostLine } from "@/components/calculator/fixed-cost-row-item";
import { StepHeader } from "@/components/calculator/wizard/step-header";
import { StepNav } from "@/components/calculator/wizard/step-nav";

type FixedCostsStepProps = {
  lines: readonly FixedCostLine[];
  totalFixed: string;
};

// The lines and their total come from the server on every render, so the step
// has no client state of its own: each save revalidates the page.
export function FixedCostsStep({ lines, totalFixed }: FixedCostsStepProps) {
  return (
    <>
      <section className="rounded-[32px] bg-white/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
        <StepHeader
          currentStep={2}
          title="Costos fijos del mes"
          description="Lo pagás igual si vendés mucho o poco, por ejemplo el alquiler."
        />

        <div className="mt-4">
          <FixedCostsTable lines={lines} totalFixed={totalFixed} />
        </div>

        <StepNav previous="/paso-1" next="/paso-3" />
      </section>
    </>
  );
}
