"use client";

import type { ProductItem } from "@/lib/schemas/products/products";
import { formatARS } from "@/lib/money/format";

type ProductRecipeProps = {
  product: ProductItem;
  onEdit: () => void;
};

// Detail view of a saved recipe. It renders inside the shared catalog modal, so
// it keeps the same table pattern as the list and offers the edit shortcut.
export function ProductRecipe({ product, onEdit }: ProductRecipeProps) {
  return (
    <section aria-label={`Receta de ${product.name}`} className="space-y-3">
      <div className="overflow-x-auto rounded-[16px] border border-border-control">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-control">
              <th scope="col" className="px-3 py-3 font-semibold text-fg-muted">
                Insumo
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold text-fg-muted">
                Cantidad
              </th>
              <th scope="col" className="px-3 py-3 font-semibold text-fg-muted">
                Unidad
              </th>
            </tr>
          </thead>
          <tbody>
            {product.recipe.map((item) => (
              <tr
                key={item.supplyId}
                className="border-b border-border-control last:border-0"
              >
                <td className="px-3 py-3 text-fg">{item.supplyName}</td>
                <td className="px-3 py-3 text-right font-semibold text-fg">
                  {item.quantity}
                </td>
                <td className="px-3 py-3 text-fg-muted">{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-fg-muted">
        {product.yieldQuantity === null
          ? "Este producto histórico todavía no tiene rendimiento; no se calcula un costo variable."
          : `Rendimiento de la receta: ${product.yieldQuantity} ${product.yieldQuantity === "1" ? "unidad." : "unidades."}`}
      </p>
      {product.variableCosts && (
        <dl className="grid gap-2 rounded-[16px] border border-border-control bg-surface-tint p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-fg-muted">Costo de ingredientes</dt>
            <dd className="font-semibold text-fg">{formatARS(product.variableCosts.ingredientsCost) || "Importe no disponible"}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Costo variable por unidad</dt>
            <dd className="font-semibold text-fg">{formatARS(product.variableCosts.unitCost) || "Importe no disponible"}</dd>
          </div>
        </dl>
      )}
      {product.variableCostsUnavailableCode !== null && (
        <p role="status" className="text-sm text-fg-muted">
          No se puede calcular el costo variable con los datos actuales de la receta.
        </p>
      )}

      <p className="text-sm text-fg-muted">
        {product.recipe.length === 1
          ? "La receta usa 1 insumo de tu catálogo."
          : `La receta usa ${product.recipe.length} insumos de tu catálogo.`}
      </p>

      <div className="flex justify-end">
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
