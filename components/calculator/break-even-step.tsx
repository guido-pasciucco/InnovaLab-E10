import { continueToStep7 } from "@/app/(calculator)/paso-6/actions";
import { BreakEvenChart } from "@/components/charts/break-even-chart";
import { StepHeader } from "@/components/calculator/wizard/step-header";
import { StepNav } from "@/components/calculator/wizard/step-nav";
import { formatARS } from "@/lib/money/format";

import type { BreakEvenStepProps } from "./break-even-step-values";

// Shown instead of the chart when there is no break-even to draw yet.
const MESSAGES: Record<Exclude<BreakEvenStepProps["status"], "ready">, string> = {
  "missing-costs": "Cargá tus costos en los pasos 2 y 3 para ver tu punto de equilibrio.",
  "missing-margin": "Guardá tu margen en el paso 5 para ver tu punto de equilibrio.",
  "no-contribution":
    "Con este precio, cada venta no cubre su costo variable, así que no hay punto de equilibrio. Probá con un margen más alto en el paso 5.",
};

export function BreakEvenStep(props: BreakEvenStepProps) {
  return (
    <section className="rounded-[32px] bg-surface/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
      <StepHeader currentStep={6} title="Punto de equilibrio" />

      {props.status === "ready" ? (
        <BreakEvenResult {...props} />
      ) : (
        <p role="status" className="mt-6 text-base text-fg-muted">
          {MESSAGES[props.status]}
        </p>
      )}

      <StepNav previous="/paso-5" nextAction={continueToStep7} />
    </section>
  );
}

function BreakEvenResult({
  volume,
  breakEvenUnits,
  exceedsVolume,
  breakEvenSales,
  chart,
}: Extract<BreakEvenStepProps, { status: "ready" }>) {
  return (
    <>
      <p className="mt-2 text-base text-fg-muted">
        Necesitás vender <span className="font-semibold text-fg">{breakEvenUnits}</span>{" "}
        {exceedsVolume
          ? `unidades, más que las ${volume} que estimás.`
          : `de las ${volume} unidades que estimás.`}
      </p>

      <div className="mt-8 rounded-[20px] bg-[#f7faf8] p-3 sm:p-5">
        <BreakEvenChart
          points={chart.points}
          volume={chart.volume}
          breakEvenUnits={chart.breakEvenUnits}
          breakEvenSales={chart.breakEvenSales}
          description={chart.description}
        />
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[16px] border-2 border-brand-green-600 bg-brand-green-50 p-5">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-green-700">
            Unidades de equilibrio
          </dt>
          <dd className="mt-3 text-4xl font-bold text-fg">{breakEvenUnits}</dd>
        </div>

        <div className="rounded-[16px] border border-border-default bg-[#f9fafb] p-5">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
            Ventas de equilibrio
          </dt>
          <dd className="mt-3 text-3xl font-bold tabular-nums text-fg sm:text-4xl">
            {formatARS(breakEvenSales)}
          </dd>
        </div>
      </dl>
    </>
  );
}
