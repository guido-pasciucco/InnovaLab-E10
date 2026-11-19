"use client";

import type { ProductItem } from "@/lib/schemas/products/products";
import { VariableCostsSummary } from "./variable-costs-summary";

type ProductRecipeProps = {
  product: ProductItem;
  onEdit: (product: ProductItem) => void;
};

export function ProductRecipe({ product, onEdit }: ProductRecipeProps) {
  return (
    <section
      aria-label={`Receta de ${product.name}`}
      className="rounded-[24px] bg-surface p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
            Receta guardada
          </p>
          <h3 className="mt-1 text-lg font-semibold text-fg">{product.name}</h3>
        </div>
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="min-h-9 rounded-[10px] border border-border-control px-3 py-1 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Editar
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-[16px] border border-border-default">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-surface-tint">
              <th scope="col" className="px-4 py-3 font-semibold text-fg-muted">
                Insumo
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold text-fg-muted">
                Cantidad
              </th>
            </tr>
          </thead>
          <tbody>
            {product.recipe.map((item) => (
              <tr
                key={item.supplyId}
                className="border-t border-border-default last:border-b-0"
              >
                <td className="px-4 py-3 text-fg">{item.supplyName}</td>
                <td className="px-4 py-3 text-right font-semibold text-fg">
                  {item.quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-fg-muted">
        {product.yieldQuantity === null
          ? "Este producto histórico todavía no tiene rendimiento; no se calcula un costo variable."
          : `Rendimiento de la receta: ${product.yieldQuantity} ${product.yieldQuantity === "1" ? "unidad." : "unidades."}`}
      </p>
      {product.variableCosts && (
        <div className="mt-5">
          <VariableCostsSummary productName={product.name} costs={product.variableCosts} />
        </div>
      )}
      {product.variableCostsUnavailableCode !== null && (
        <p role="status" className="mt-3 text-sm text-fg-muted">
          No se puede calcular el costo variable con los datos históricos actuales.
        </p>
      )}
      <p className="mt-3 text-sm text-fg-muted">
        {product.recipe.length === 1
          ? "La receta usa 1 insumo de tu catálogo."
          : `La receta usa ${product.recipe.length} insumos de tu catálogo.`}
      </p>
    </section>
  );
}
