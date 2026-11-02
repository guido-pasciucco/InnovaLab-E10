import { continueCalculation, createCalculation } from "@/app/dashboard/actions";
import { TOTAL_STEPS } from "@/components/calculator/wizard/wizard-steps";
import type { CalculationSummary } from "@/lib/types/calculator";

const dateFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

function NewCalculationButton() {
  return (
    <form action={createCalculation}>
      <button
        type="submit"
        className="rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-on-action-primary hover:bg-action-primary-hover"
      >
        Nuevo cálculo
      </button>
    </form>
  );
}

// Server component: the user's calculations with reopen / create actions.
export function CalculationList({ items }: { items: CalculationSummary[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-border-default bg-surface-tint p-6 text-center">
        <p className="mb-4 text-sm text-fg-muted">Todavía no tenés cálculos.</p>
        <div className="flex justify-center">
          <NewCalculationButton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-md border border-border-default bg-surface-tint p-4"
          >
            <div>
              <p className="font-medium text-fg">{item.productName}</p>
              <p className="text-sm text-fg-muted">
                {item.status === "draft" ? "Borrador" : item.status} · Paso {item.currentStep} de{" "}
                {TOTAL_STEPS}
              </p>
              <p className="text-xs text-fg-muted">
                Actualizado {dateFormat.format(item.updatedAt)}
              </p>
            </div>
            <form action={continueCalculation}>
              <input type="hidden" name="calculationId" value={item.id} />
              <button
                type="submit"
                className="rounded-md border border-border-control px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface"
              >
                Continuar cálculo
              </button>
            </form>
          </li>
        ))}
      </ul>
      <NewCalculationButton />
    </div>
  );
}
