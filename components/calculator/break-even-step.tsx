import { BreakEvenChart, type BreakEvenPoint } from "@/components/charts/break-even-chart";
import { StepHeader } from "@/components/calculator/wizard/step-header";
import { StepNav } from "@/components/calculator/wizard/step-nav";
import { formatARS } from "@/lib/money/format";

// Demo data until the results view is connected to the calculation service.
// The values mirror the design: fixed costs of $300.000 cross revenue at 96 of
// the 200 estimated units.
const demo = {
  volume: 200,
  breakEvenUnits: 96,
  breakEvenSales: "562285.71",
  fixedCosts: "300000",
  revenueAtVolume: "1171428.56",
  totalCostAtVolume: "846428.56",
} as const;

const fixedCosts = Number(demo.fixedCosts);
const breakEvenSales = Number(demo.breakEvenSales);

const chartPoints: BreakEvenPoint[] = [
  {
    units: 0,
    revenue: 0,
    totalCost: fixedCosts,
    fixedCost: fixedCosts,
  },
  {
    units: demo.breakEvenUnits,
    revenue: breakEvenSales,
    totalCost: breakEvenSales,
    fixedCost: fixedCosts,
  },
  {
    units: demo.volume,
    revenue: Number(demo.revenueAtVolume),
    totalCost: Number(demo.totalCostAtVolume),
    fixedCost: fixedCosts,
  },
];

const chartDescription = `Gráfico de punto de equilibrio. Ingresos y costos totales se cruzan en ${demo.breakEvenUnits} unidades, con ventas de equilibrio de ${formatARS(demo.breakEvenSales)}. Los costos fijos son de ${formatARS(demo.fixedCosts)} y se mantienen iguales en todas las unidades.`;

export function BreakEvenStep() {
  return (
    <section className="rounded-[32px] bg-surface/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
      <StepHeader currentStep={7} title="Punto de equilibrio" />
      <p className="mt-2 text-base text-fg-muted">
        Necesitás vender{" "}
        <span className="font-semibold text-fg">{demo.breakEvenUnits}</span>{" "}
        de las {demo.volume} unidades que estimás.
      </p>

      <div className="mt-8 rounded-[20px] bg-[#f7faf8] p-3 sm:p-5">
        <BreakEvenChart
          points={chartPoints}
          volume={demo.volume}
          breakEvenUnits={demo.breakEvenUnits}
          breakEvenSales={breakEvenSales}
          description={chartDescription}
        />
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[16px] border-2 border-[var(--brand-green-600,var(--color-green-600))] bg-[var(--brand-green-50,var(--color-green-50))] p-5">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-green-700,var(--color-green-700))]">
            Unidades de equilibrio
          </dt>
          <dd className="mt-3 text-4xl font-bold text-gray-900">
            {demo.breakEvenUnits}
          </dd>
        </div>

        <div className="rounded-[16px] border border-gray-200 bg-[#f9fafb] p-5">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Ventas de equilibrio
          </dt>
          <dd className="mt-3 text-3xl font-bold tabular-nums text-gray-900 sm:text-4xl">
            {formatARS(demo.breakEvenSales)}
          </dd>
        </div>
      </dl>

      <StepNav previous="/paso-6" next="/resultados" />
    </section>
  );
}
