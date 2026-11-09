"use client";

import { useState } from "react";

import type { SupplyItem } from "@/lib/schemas/supplies/supplies";
import { SuppliesForm } from "./supplies-form";
import { SuppliesTable } from "./supplies-table";

type SuppliesCatalogProps = {
  supplies: SupplyItem[];
};

// Client wrapper: holds which supply (if any) is being edited and toggles
// the form between create and edit mode. The list itself is server-rendered
// and refreshed by revalidatePath after each mutation.
export function SuppliesCatalog({ supplies }: SuppliesCatalogProps) {
  const [editing, setEditing] = useState<SupplyItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (supply: SupplyItem) => {
    setEditing(supply);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditing(null);
    setShowForm(false);
  };

  const handleSaved = () => {
    setEditing(null);
    setShowForm(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section aria-label="Lista de insumos" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">
            Mis insumos ({supplies.length})
          </h2>
          <button
            type="button"
            onClick={handleNew}
            className="min-h-11 rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover active:bg-action-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            + Nuevo
          </button>
        </div>

        <SuppliesTable supplies={supplies} onEdit={handleEdit} />
      </section>

      {showForm && (
        <aside aria-label="Formulario de insumo">
          <SuppliesForm
            supply={editing}
            onCancel={handleCancel}
            onSaved={handleSaved}
          />
        </aside>
      )}
    </div>
  );
}
