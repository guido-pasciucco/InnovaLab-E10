import Link from "next/link";

import { BreakEvenChart, type BreakEvenPoint } from "@/components/charts/break-even-chart";
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
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <section className="rounded-[32px] bg-white p-6 shadow-[0_24px_48px_rgba(10,89,51,0.14)] sm:p-10">
        <span className="inline-flex rounded-full border border-[var(--brand-green-500,var(--color-green-500))] bg-[var(--brand-green-50,var(--color-green-50))] px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-green-700,var(--color-green-700))]">
          Paso 7 de 7
        </span>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Punto de equilibrio
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Necesitás vender{" "}
          <span className="font-semibold text-gray-900">{demo.breakEvenUnits}</span>{" "}
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

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-center gap-3 sm:gap-4">
          {/* Temporary target: step 6 does not exist until the wizard lands. */}
          <Link
            href="/paso-2"
            className="flex min-h-[54px] items-center justify-center rounded-[14px] text-lg font-semibold text-[var(--brand-green-700,var(--color-green-700))] transition-colors hover:bg-[var(--brand-green-50,var(--color-green-50))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green-600,var(--color-green-600))]"
          >
            Anterior
          </Link>

          {/* Scenarios belong to their own ticket; this is the visual step. */}
          <button
            type="button"
            className="min-h-[54px] w-full rounded-[14px] bg-[#0a7a12] px-4 py-3 text-lg font-semibold text-white transition-colors hover:bg-[#08660f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a7a12]"
          >
            Ver escenarios
          </button>
        </div>
      </section>
    </main>
  );
}
