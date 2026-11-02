import { continueCalculation, createCalculation } from "@/app/dashboard/actions";
import { TOTAL_STEPS } from "@/components/calculator/wizard/wizard-steps";
import type { CalculationSummary } from "@/lib/types/calculator";

const dateFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

const PRIMARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function NewCalculationButton() {
  return (
    <form action={createCalculation}>
      <button type="submit" className={PRIMARY_BUTTON}>
        Nuevo cálculo
      </button>
    </form>
  );
}

function StepProgress({ step }: { step: number }) {
  const pct = Math.round((Math.min(step, TOTAL_STEPS) / TOTAL_STEPS) * 100);
  return (
    <div>
      <p className="text-sm font-medium text-fg">
        Paso {step} de {TOTAL_STEPS}
      </p>
      <div
        className="mt-1.5 h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-brand-green-50"
        aria-hidden="true"
      >
        <div className="h-full rounded-full bg-action-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Server component: the user's calculations with reopen / create actions.
// Only data we persist today is shown; price, margin and break-even columns
// arrive once the pricing and results steps save their calculations.
export function CalculationList({ items }: { items: CalculationSummary[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[24px] border border-border-default bg-surface p-8 text-center shadow-sm">
        <p className="text-sm text-fg-muted">
          Todavía no tenés cálculos. Empezá uno con &quot;Nuevo cálculo&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-border-default bg-surface shadow-sm">
      <div
        className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_auto] gap-4 border-b border-border-default bg-surface-tint px-6 py-3 text-xs font-semibold tracking-wide text-fg-muted uppercase md:grid"
        aria-hidden="true"
      >
        <span>Cálculo</span>
        <span>Avance</span>
        <span>Actualizado</span>
        <span>Acción</span>
      </div>
      <ul className="divide-y divide-border-default">
        {items.map((item) => (
          <li
            key={item.id}
            className="grid gap-3 px-6 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_auto] md:items-center md:gap-4"
          >
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-fg">{item.productName}</p>
              <span className="mt-1 inline-block rounded-full bg-brand-green-50 px-2.5 py-0.5 text-xs font-medium text-brand-green-700">
                {item.status === "draft" ? "Borrador" : item.status}
              </span>
            </div>
            <StepProgress step={item.currentStep} />
            <p className="text-sm text-fg-muted">{dateFormat.format(item.updatedAt)}</p>
            <form action={continueCalculation}>
              <input type="hidden" name="calculationId" value={item.id} />
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-brand-green-50 px-4 py-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:w-auto"
              >
                Continuar cálculo
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
