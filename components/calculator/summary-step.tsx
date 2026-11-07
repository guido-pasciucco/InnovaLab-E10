import Link from "next/link";

import { createCalculation } from "@/app/dashboard/actions";
import { StepHeader } from "@/components/calculator/wizard/step-header";
import type { CalculatorSummary, CalculatorSummaryStatus } from "@/lib/types/calculator";

import { SummaryCopyButton } from "./summary-copy-button";
import {
  SUMMARY_DISCLAIMER,
  buildSummaryText,
  summaryAssumptions,
  toSummaryRows,
} from "./summary-step-values";

// Shown instead of the share actions while a figure is missing, with the same
// wording as step 6.
const MESSAGES: Record<Exclude<CalculatorSummaryStatus, "ready">, string> = {
  "missing-costs": "Cargá tus costos en los pasos 2 y 3 para ver tu resumen.",
  "missing-margin": "Guardá tu margen en el paso 5 para ver tu resumen.",
  "no-contribution":
    "Con este precio, cada venta no cubre su costo variable. Probá con un margen más alto en el paso 5.",
};

// Same button classes as StepNav and step 7.
const BUTTON =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[14px] px-4 py-2 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const PRIMARY = `${BUTTON} bg-action-primary text-on-action-primary hover:bg-action-primary-hover`;
const SECONDARY = `${BUTTON} border border-brand-green-600 text-brand-green-700 hover:bg-brand-green-50 disabled:cursor-not-allowed disabled:border-border-default disabled:text-fg-disabled disabled:hover:bg-transparent`;
const TEXT = `${BUTTON} text-brand-green-700 hover:bg-brand-green-50`;
const NAV_BUTTON = "sm:w-auto sm:min-w-36";

// The last step: the figures of steps 1-6 and the ways to take them away. The
// PDF is a plain download from a route handler, so it needs no client code.
export function SummaryStep({ summary }: { summary: CalculatorSummary }) {
  return (
    <section className="rounded-[32px] bg-surface/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
      <StepHeader
        currentStep={8}
        badge="Resumen"
        title="Resumen y compartir"
        description="Revisá tus resultados y supuestos, y llevátelos para decidir con números."
      />

      <dl className="mt-6 divide-y divide-border-default border-y border-border-default">
        {toSummaryRows(summary).map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-base text-fg-muted">{row.label}</dt>
            <dd className="text-right text-lg font-bold tabular-nums text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-sm text-fg-muted">{summaryAssumptions(summary)}</p>

      {summary.status === "ready" ? (
        <div className="mt-6 flex flex-col gap-3">
          <a href="/paso-8/ficha" download className={PRIMARY}>
            Descargar ficha en PDF
          </a>
          {/* Not built yet: shown so the user knows it is coming. */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Próximamente"
            className={SECONDARY}
          >
            Enviar por WhatsApp
          </button>
          <SummaryCopyButton text={buildSummaryText(summary)} className={TEXT} />
        </div>
      ) : (
        <p role="status" className="mt-6 text-base text-fg-muted">
          {MESSAGES[summary.status]}
        </p>
      )}

      <p className="mt-4 text-sm text-fg-muted">{SUMMARY_DISCLAIMER}</p>

      <nav
        aria-label="Navegación entre pasos"
        className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <Link href="/paso-7" className={`${TEXT} ${NAV_BUTTON}`}>
          Anterior
        </Link>
        <form action={createCalculation} className="contents">
          <button type="submit" className={`${SECONDARY} ${NAV_BUTTON}`}>
            Nuevo cálculo
          </button>
        </form>
      </nav>
    </section>
  );
}
