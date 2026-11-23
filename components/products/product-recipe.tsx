"use client";

import type { ProductItem } from "@/lib/schemas/products/products";
import {
  formatMonthlyCapacity,
  MONTHLY_CAPACITY_EMPTY_LABEL,
} from "@/components/products/monthly-capacity";
import { VariableCostResult } from "./variable-cost-result";

type ProductRecipeProps = {
  product: ProductItem;
  onEdit: () => void;
};

// Detail view of a saved recipe. It renders inside the shared catalog modal and
// follows the catalog table pattern: editable data on top, calculated result in
// its own read-only block (#288).
export function ProductRecipe({ product, onEdit }: ProductRecipeProps) {
  const capacity = formatMonthlyCapacity(product.monthlyCapacity);
  const capacityLabel =
    capacity === MONTHLY_CAPACITY_EMPTY_LABEL
      ? capacity
      : `${capacity} unidades`;

  return (
    <section aria-label={`Receta de ${product.name}`} className="space-y-4">
      <header className="space-y-0.5">
        <p className="text-xs font-bold tracking-[0.12em] text-brand-green-700 uppercase">
          Receta guardada
        </p>
        <h3 className="text-base font-semibold text-fg">Insumos y cantidades</h3>
      </header>

      <div className="overflow-x-auto rounded-[16px] border border-border-default">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-tint">
            <tr className="border-b border-border-default">
              <th scope="col" className="px-3 py-2.5 text-xs font-bold tracking-wide text-fg-muted uppercase">
                Insumo
              </th>
              <th scope="col" className="px-3 py-2.5 text-right text-xs font-bold tracking-wide text-fg-muted uppercase">
                Cantidad
              </th>
              <th scope="col" className="px-3 py-2.5 text-xs font-bold tracking-wide text-fg-muted uppercase">
                Unidad
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {product.recipe.map((item) => (
              <tr key={item.supplyId}>
                <td className="px-3 py-3 text-fg">{item.supplyName}</td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums text-fg">
                  {item.quantity}
                </td>
                <td className="px-3 py-3 text-fg-muted">{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-[14px] border border-border-default bg-surface px-3 py-2.5 text-sm">
          <dt className="text-xs font-semibold text-fg-muted">Rendimiento</dt>
          <dd className="mt-0.5 font-semibold text-fg">
            {product.yieldQuantity === null
              ? "Sin rendimiento cargado"
              : `${product.yieldQuantity} ${product.yieldQuantity === "1" ? "unidad" : "unidades"}`}
          </dd>
        </div>
        <div className="rounded-[14px] border border-border-default bg-surface px-3 py-2.5 text-sm">
          <dt className="text-xs font-semibold text-fg-muted">Capacidad mensual</dt>
          <dd className="mt-0.5 font-semibold text-fg">{capacityLabel}</dd>
        </div>
      </dl>

      {product.yieldQuantity === null && (
        <p className="text-sm text-fg-muted">
          Este producto histórico todavía no tiene rendimiento; no se calcula un costo variable.
        </p>
      )}

      <VariableCostResult
        costs={product.variableCosts}
        unavailableCode={product.variableCostsUnavailableCode}
      />

      <p className="text-sm text-fg-muted">
        {product.recipe.length === 1
          ? "La receta usa 1 insumo de tu catálogo."
          : `La receta usa ${product.recipe.length} insumos de tu catálogo.`}
      </p>

      <div className="flex justify-end border-t border-border-default pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="min-h-11 rounded-[14px] border border-border-control bg-surface px-4 py-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Editar receta
        </button>
      </div>
    </section>
  );
}
