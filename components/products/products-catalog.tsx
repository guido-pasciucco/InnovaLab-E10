"use client";

import { useState } from "react";

import type {
  ProductItem,
  RecipeSupplyOption,
} from "@/lib/schemas/products/products";
import { ProductForm } from "./product-form";
import { ProductRecipe } from "./product-recipe";
import { ProductsList } from "./products-list";

type ProductsCatalogProps = {
  initialProducts: ProductItem[];
  supplies: RecipeSupplyOption[];
};

export function ProductsCatalog({
  initialProducts,
  supplies,
}: ProductsCatalogProps) {
  // UI-only for now (issue #240 frontend). The products live in component
  // state until the backend persistence contract lands, so every save is
  // visible immediately but does not survive a reload yet.
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const selectedProduct =
    products.find((product) => product.id === selectedId) ?? null;

  const handleNew = () => {
    setEditing(null);
    setShowForm(true);
    setStatus(null);
  };

  const handleSelect = (product: ProductItem) => {
    setSelectedId(product.id);
    setEditing(null);
    setShowForm(false);
    setStatus(null);
  };

  const handleEdit = (product: ProductItem) => {
    setEditing(product);
    setSelectedId(product.id);
    setShowForm(true);
    setStatus(null);
  };

  const handleCancel = () => {
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = (saved: ProductItem) => {
    setProducts((current) => {
      const exists = current.some((product) => product.id === saved.id);

      return exists
        ? current.map((product) => (product.id === saved.id ? saved : product))
        : [...current, saved];
    });
    setSelectedId(saved.id);
    setEditing(null);
    setShowForm(false);
    setStatus(`«${saved.name}» y su receta quedaron guardados en esta sesión.`);
  };

  const handleDelete = (product: ProductItem) => {
    if (!confirm(`¿Borrar «${product.name}» y su receta?`)) return;

    setProducts((current) =>
      current.filter((item) => item.id !== product.id),
    );

    if (selectedId === product.id) setSelectedId(null);
    if (editing?.id === product.id) {
      setEditing(null);
      setShowForm(false);
    }

    setStatus(`«${product.name}» se borró de esta pantalla.`);
  };

  return (
    <div className="space-y-4">
      {status && (
        <p
          role="status"
          className="rounded-[16px] bg-success-subtle px-4 py-3 text-sm font-medium text-success"
        >
          {status}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <ProductsList
          products={products}
          selectedId={selectedId}
          onNew={handleNew}
          onSelect={handleSelect}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <aside aria-label="Detalle del producto" className="lg:sticky lg:top-6 lg:self-start">
          {showForm ? (
            <ProductForm
              product={editing}
              supplies={supplies}
              onCancel={handleCancel}
              onSave={handleSave}
            />
          ) : selectedProduct ? (
            <ProductRecipe product={selectedProduct} onEdit={handleEdit} />
          ) : (
            <section className="rounded-[24px] bg-surface p-6 text-center shadow-sm">
              <p className="text-base font-semibold text-fg">
                Elegí un producto para ver su receta
              </p>
              <p className="mt-2 text-sm text-fg-muted">
                También podés crear uno nuevo y armar la receta con los insumos
                que ya cargaste.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
