import Link from "next/link";

import { ArrowRightIcon, ChartIcon, SparklesIcon } from "@/components/home/icons";
import {
  container,
  primaryButton,
  primaryButtonSmall,
  secondaryButton,
} from "@/components/home/styles";
import { BreakEvenChart } from "./break-even-chart";
import { referenceRows, referenceTotals } from "./reference-example";

const stats = [
  { value: "6 pasos", label: "guiados, de tus insumos a tu equilibrio" },
  { value: "Todos tus productos", label: "en un solo cálculo" },
  { value: "0 fórmulas", label: "para memorizar" },
] as const;

export function CalculatorHero({ ctaHref }: { ctaHref: string }) {
  return (
    <section aria-labelledby="calculator-hero-title" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-canvas/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-action-tonal/70 blur-3xl"
      />

      <div
        className={`${container} relative grid gap-12 pb-16 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-20`}
      >
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border-default bg-action-tonal px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-link">
            <SparklesIcon className="h-3.5 w-3.5" />
            Calculadora de costos
          </p>

          <h1
            id="calculator-hero-title"
            className="mt-5 max-w-2xl text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-fg sm:text-[2.55rem] lg:text-[2.9rem]"
          >
            Conocé el costo real de lo que vendés y{" "}
            <span className="mt-2 block text-link">poné un precio que se banca solo.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-6 text-fg-muted sm:text-[1.0625rem] sm:leading-7">
            Cargá tus insumos, tus productos y los gastos del mes. La calculadora reparte los costos,
            sugiere precios con un recargo y te dice cuánto tenés que vender para llegar al equilibrio.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={ctaHref} className={primaryButton}>
              Calcular mis costos
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <a href="#como-funciona" className={secondaryButton}>
              Ver los 6 pasos
            </a>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-1 gap-4 border-t border-border-default pt-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.value}>
                <p className="text-lg font-semibold tracking-[-0.02em] text-fg sm:text-xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-fg-muted sm:text-xs sm:leading-5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative w-full justify-self-center sm:w-[94%] lg:w-[90%]">
          <div className="rounded-[26px] border border-border-default bg-surface p-4 shadow-[0_28px_80px_-36px_rgba(11,107,79,0.5)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-action-tonal text-link">
                  <ChartIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg">Resumen del ejemplo</p>
                  <p className="mt-0.5 text-[11px] text-fg-muted">Alfajor · 2 presentaciones</p>
                </div>
              </div>
              <span className="rounded-full bg-action-tonal px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-link">
                Ejemplo
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              <HeroMetric label="Precio · Unidad" value={referenceRows[0].price} highlight />
              <HeroMetric label="Precio · Caja x6" value={referenceRows[1].price} />
              <HeroMetric label="Ventas de equilibrio" value={referenceTotals.breakEvenSales} />
            </div>

            <div className="mt-4 rounded-2xl border border-border-default bg-surface-tint p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-fg">Ingresos y costos totales</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-fg-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded-full bg-action-primary" />
                    Ingresos
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded-full bg-fg-muted" />
                    Costos totales
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0 w-4 border-t-2 border-dashed border-warning" />
                    Gastos del mes
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <BreakEvenChart />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-action-tonal p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-fg-muted">
                Con este ejemplo, vendé{" "}
                <strong className="font-bold text-link">{referenceRows[0].wholeUnits} unidades</strong>{" "}
                y <strong className="font-bold text-link">{referenceRows[1].wholeUnits} cajas x6</strong>{" "}
                por mes para cubrir {referenceTotals.fixedCosts} de gastos.
              </p>
              <Link href={ctaHref} className={`${primaryButtonSmall} shrink-0`}>
                Calcular el mío
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMetric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-2.5 py-3 sm:px-3 ${
        highlight
          ? "border-action-primary bg-action-primary text-on-action-primary"
          : "border-border-default bg-surface-tint"
      }`}
    >
      <p
        className={`text-[10px] font-medium leading-4 ${
          highlight ? "text-on-brand" : "text-fg-muted"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold tracking-[-0.02em] sm:text-base ${
          highlight ? "text-on-action-primary" : "text-fg"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
