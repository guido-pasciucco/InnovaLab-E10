"use client";

import type { ProductItem } from "@/lib/schemas/products/products";

type ProductsListProps = {
  products: ProductItem[];
  selectedId: string | null;
  busy?: boolean;
  onNew: () => void;
  onSelect: (product: ProductItem) => void;
  onEdit: (product: ProductItem) => void;
  onDelete: (product: ProductItem) => void;
};

export function ProductsList({
  products,
  selectedId,
  busy = false,
  onNew,
  onSelect,
  onEdit,
  onDelete,
}: ProductsListProps) {
  return (
    <section aria-label="Lista de productos" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-fg">
          Mis productos ({products.length})
        </h2>
        <button
          type="button"
          onClick={onNew}
          disabled={busy}
          className="min-h-11 rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover active:bg-action-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Nuevo
        </button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-[24px] bg-surface p-8 text-center shadow-sm">
          <p className="text-fg-muted">Todavía no cargaste ningún producto.</p>
          <p className="mt-1 text-sm text-fg-muted">
            Tocá &ldquo;+ Nuevo&rdquo; para ponerle nombre y armar su receta.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {products.map((product) => {
            const isSelected = product.id === selectedId;

            return (
              <li
                key={product.id}
                className={`rounded-[20px] bg-surface p-4 shadow-sm transition-colors ${
                  isSelected
                    ? "ring-2 ring-brand-green-500"
                    : "hover:bg-surface-tint"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => onSelect(product)}
                    aria-pressed={isSelected}
                    disabled={busy}
                    className="min-w-0 flex-1 rounded-[10px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="block truncate text-base font-semibold text-fg">
                      {product.name}
                    </span>
                    <span className="mt-1 block text-sm text-fg-muted">
                      {product.recipe.length === 1
                        ? "1 insumo en la receta"
                        : `${product.recipe.length} insumos en la receta`}
                    </span>
                  </button>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(product)}
                      disabled={busy}
                      className="min-h-9 rounded-[10px] border border-border-control px-3 py-1 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Ver receta
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      disabled={busy}
                      className="min-h-9 rounded-[10px] border border-border-control px-3 py-1 text-sm font-semibold text-fg hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(product)}
                      disabled={busy}
                      className="min-h-9 rounded-[10px] border border-border-control px-3 py-1 text-sm font-semibold text-danger hover:bg-danger-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
