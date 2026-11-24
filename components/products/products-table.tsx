"use client";

import Link from "next/link";

import type { ProductItem } from "@/lib/schemas/products/products";
import { formatMonthlyCapacity } from "./monthly-capacity";

type ProductsTableProps = {
  products: ProductItem[];
  presentationNames?: Readonly<Record<string, string[]>>;
  busy?: boolean;
  searchActive?: boolean;
  onView: (product: ProductItem) => void;
  onEdit: (product: ProductItem) => void;
  onDelete: (product: ProductItem) => void;
};

// Same list pattern as the supplies catalog: one card, a header row and one row
// per product with its actions on the right. Products add "Ver receta" because
// the recipe is their detail view, and "Presentaciones" opens P12 (#298).
export function ProductsTable({
  products,
  presentationNames = {},
  busy = false,
  searchActive = false,
  onView,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-[24px] bg-surface p-8 text-center shadow-sm">
        {searchActive ? (
          <>
            <p className="text-fg-muted">No encontramos productos con esa búsqueda.</p>
            <p className="mt-1 text-sm text-fg-muted">Probá con otra palabra.</p>
          </>
        ) : (
          <>
            <p className="text-fg-muted">Todavía no cargaste ningún producto.</p>
            <p className="mt-1 text-sm text-fg-muted">
              Tocá &ldquo;+ Nuevo&rdquo; para ponerle nombre y armar su receta.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[24px] bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-control">
            <th scope="col" className="min-w-48 px-3 py-3 font-semibold text-fg-muted">
              Nombre
            </th>
            <th
              scope="col"
              className="px-3 py-3 whitespace-nowrap font-semibold text-fg-muted"
            >
              Capacidad mensual
            </th>
            <th scope="col" className="px-3 py-3 whitespace-nowrap font-semibold text-fg-muted">
              Receta
            </th>
            <th scope="col" className="min-w-40 px-3 py-3 font-semibold text-fg-muted">
              Presentaciones
            </th>
            <th
              scope="col"
              className="px-3 py-3 whitespace-nowrap text-right font-semibold text-fg-muted"
            >
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-border-control last:border-0">
              <td className="min-w-48 px-3 py-3 text-fg">{product.name}</td>
              <td className="px-3 py-3 whitespace-nowrap text-fg-muted">
                {formatMonthlyCapacity(product.monthlyCapacity)}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-fg-muted">
                {product.recipe.length === 1
                  ? "1 insumo"
                  : `${product.recipe.length} insumos`}
              </td>
              <td className="min-w-40 px-3 py-3 text-fg-muted">
                {presentationNames[product.id]?.join(", ") || "Sin presentaciones"}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-right">
                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    onClick={() => onView(product)}
                    disabled={busy}
                    aria-label={`Ver receta de ${product.name}`}
                    className="min-h-9 rounded-[10px] border border-border-control px-2 py-1 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                  >
                    Ver receta
                  </button>
                  <Link
                    href={`/products/${product.id}/presentations`}
                    aria-label={`Presentaciones de ${product.name}`}
                    className="inline-flex min-h-9 items-center rounded-[10px] border border-border-control px-2 py-1 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    Presentaciones
                  </Link>
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    disabled={busy}
                    aria-label={`Editar ${product.name}`}
                    className="min-h-9 rounded-[10px] border border-border-control px-2 py-1 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(product)}
                    disabled={busy}
                    aria-label={`Borrar ${product.name}`}
                    className="min-h-9 rounded-[10px] border border-border-control px-2 py-1 text-sm font-semibold text-danger hover:bg-danger/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                  >
                    Borrar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
