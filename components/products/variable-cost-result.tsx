import type { ProductItem } from "@/lib/schemas/products/products";
import { formatARS } from "@/lib/money/format";

type VariableCostResultProps = {
  costs: ProductItem["variableCosts"];
  unavailableCode?: ProductItem["variableCostsUnavailableCode"];
  // A new product has no saved calculation yet: explain the empty state instead
  // of showing a zero that would look like a real result.
  pending?: boolean;
};

function money(value: string): string {
  return formatARS(value) || "Importe no disponible";
}

/**
 * Read-only presentation of the engine's variable cost (#288). Shared by the
 * product form and the recipe detail so the calculated result never competes
 * visually with the editable fields and has a single implementation.
 */
export function VariableCostResult({
  costs,
  unavailableCode = null,
  pending = false,
}: VariableCostResultProps) {
  const hasCosts = costs !== null && costs !== undefined;

  return (
    <section
      aria-label="Costo variable calculado"
      className="overflow-hidden rounded-[16px] border border-border-default bg-action-tonal"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default bg-surface-tint px-4 py-2">
        <p className="text-xs font-bold tracking-[0.12em] text-fg-muted uppercase">
          Resultado calculado
        </p>
        <span className="rounded-full border border-border-default bg-surface px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
          Solo lectura
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-fg">Costo variable por unidad</p>
          <p className="text-xs text-fg-muted">
            {hasCosts
              ? `Costo de ingredientes: ${money(costs.ingredientsCost)}`
              : pending
                ? "Se calculará cuando guardes la receta y el rendimiento."
                : "Completá la receta y el rendimiento para calcularlo."}
          </p>
        </div>
        <p className="text-2xl font-bold tabular-nums text-fg">
          {hasCosts ? money(costs.unitCost) : "—"}
        </p>
      </div>

      {!hasCosts && unavailableCode !== null && !pending && (
        <p className="border-t border-border-default px-4 py-2 text-sm text-fg-muted">
          No se puede calcular el costo variable con los datos actuales de la receta.
        </p>
      )}
    </section>
  );
}
