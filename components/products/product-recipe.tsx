"use client";

import type { ProductItem } from "@/lib/schemas/products/products";

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
