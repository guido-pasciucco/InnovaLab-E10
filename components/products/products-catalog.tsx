"use client";

import { Button } from "@/components/ui/button";

import { useMemo, useState, useTransition } from "react";

import { deleteProduct } from "@/app/(business)/products/actions";
import type {
  ProductItem,
  RecipeSupplyOption,
} from "@/lib/schemas/products/products";
import { CatalogModal } from "@/components/ui/catalog-modal";
import { normalizeForSearch } from "@/components/ui/normalize-search";
import { ProductForm } from "./product-form";
import { ProductRecipe } from "./product-recipe";
import { ProductsTable } from "./products-table";

type ProductsCatalogProps = {
  initialProducts: ProductItem[];
  supplies: RecipeSupplyOption[];
  presentationNames?: Readonly<Record<string, string[]>>;
};

// Client wrapper that mirrors the supplies catalog: the section owns the list,
// the search and the modals, so the form never renders inline below the table.
export function ProductsCatalog({
  initialProducts,
  supplies,
  presentationNames = {},
}: ProductsCatalogProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [editing, setEditing] = useState<ProductItem | null>(null);
  const [viewingId, setViewingId] = useState<ProductItem["id"] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const query = normalizeForSearch(search);
  const filtered = useMemo(() => {
    if (!query) return products;

    return products.filter((product) =>
      [product.name, ...product.recipe.map((item) => item.supplyName)].some(
        (value) => normalizeForSearch(value).includes(query),
      ),
    );
  }, [products, query]);

  // Derived from the list so the detail always shows the saved version and
  // closes on its own when the product is deleted.
  const viewing = products.find((product) => product.id === viewingId) ?? null;

  const handleNew = () => {
    setEditing(null);
    setViewingId(null);
    setShowForm(true);
    setStatus(null);
    setError(null);
  };

  const handleView = (product: ProductItem) => {
    setViewingId(product.id);
    setStatus(null);
    setError(null);
  };

  const handleEdit = (product: ProductItem) => {
    setEditing(product);
    setViewingId(null);
    setShowForm(true);
    setStatus(null);
    setError(null);
  };

  const handleCancel = () => {
    setEditing(null);
    setShowForm(false);
    setError(null);
  };

  const handleSaved = (saved: ProductItem) => {
    setProducts((current) => {
      const exists = current.some((product) => product.id === saved.id);

      return exists
        ? current.map((product) => (product.id === saved.id ? saved : product))
        : [...current, saved];
    });
    setEditing(null);
    setShowForm(false);
    setError(null);
    setStatus(editing ? "Producto actualizado." : "Producto guardado en tu catálogo.");
  };

  const handleDelete = (product: ProductItem) => {
    if (!confirm(`¿Borrar «${product.name}» y su receta?`)) return;

    setStatus(null);
    setError(null);

    startDelete(async () => {
      const result = await deleteProduct(undefined, { id: product.id });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      );

      if (editing?.id === product.id) {
        setEditing(null);
        setShowForm(false);
      }

      setStatus(`«${product.name}» se borró del catálogo.`);
    });
  };

  const formTitle = `${editing ? "Editar" : "Nuevo"} producto`;

  return (
    <div className="min-w-0 space-y-3.5">
      {error && (
        <p
          role="alert"
          className="rounded-[16px] bg-danger-subtle px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      {status && (
        <p
          role="status"
          className="rounded-[16px] bg-success-subtle px-4 py-3 text-sm font-medium text-success"
        >
          {status}
        </p>
      )}

      <section aria-label="Lista de productos" className="min-w-0 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-fg">
            Productos ({filtered.length})
          </h2>
          <Button variant="primary" size="md"
            type="button"
            onClick={handleNew}
            disabled={isDeleting}
            className="min-h-10! shrink-0! rounded-xl! bg-action-primary! px-4! py-2! text-sm! font-semibold! text-on-action-primary! hover:bg-action-primary-hover! active:bg-action-primary-pressed! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:cursor-not-allowed! disabled:opacity-50!"
          >
            + Nuevo
          </Button>
        </div>

        {products.length > 0 && (
          <div className="flex max-w-2xl flex-col gap-1">
            <label htmlFor="products-search" className="text-sm font-semibold text-fg-muted">
              Buscar
            </label>
            <input
              id="products-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre del producto o insumo…"
              className="min-h-10 w-full rounded-xl border border-border-control bg-surface px-3.5 py-2 text-sm text-fg placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>
        )}

        <ProductsTable
          products={filtered}
          presentationNames={presentationNames}
          busy={isDeleting}
          searchActive={query !== ""}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </section>

      {showForm && (
        <CatalogModal
          title={formTitle}
          description="Datos, receta y rendimiento en un solo lugar."
          onClose={handleCancel}
          size="lg"
        >
          <ProductForm
            product={editing}
            supplies={supplies}
            hasPresentations={
              editing ? (presentationNames[editing.id]?.length ?? 0) > 0 : false
            }
            onCancel={handleCancel}
            onSaved={handleSaved}
          />
        </CatalogModal>
      )}

      {viewing && (
        <CatalogModal
          title={viewing.name}
          description="Receta guardada y costo variable calculado."
          onClose={() => setViewingId(null)}
          size="lg"
        >
          <ProductRecipe
            product={viewing}
            onEdit={() => handleEdit(viewing)}
          />
        </CatalogModal>
      )}
    </div>
  );
}
