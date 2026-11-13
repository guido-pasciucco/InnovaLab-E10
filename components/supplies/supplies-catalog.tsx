"use client";

import { useMemo, useState } from "react";

import type { SupplyKind } from "@/lib/schemas/supplies/fields";
import type { SupplyItem } from "@/lib/schemas/supplies/supplies";
import { SuppliesForm } from "./supplies-form";
import { SuppliesModal } from "./supplies-modal";
import { SuppliesTable } from "./supplies-table";

type SuppliesCatalogProps = {
  supplies: SupplyItem[];
};

// Accent-insensitive, case-insensitive search so "harina" finds "Harina" and
// "azucar" finds "Azúcar".
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const TAB_BASE =
  "min-h-10 rounded-[10px] px-4 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Client wrapper: the Insumos / Packaging tabs own the list, the search and the
// create/edit modal, so the form never renders inline below the table.
export function SuppliesCatalog({ supplies }: SuppliesCatalogProps) {
  const [activeKind, setActiveKind] = useState<SupplyKind>("supply");
  const [editing, setEditing] = useState<SupplyItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const counts = useMemo(
    () => ({
      supply: supplies.filter((supply) => supply.kind === "supply").length,
      packaging: supplies.filter((supply) => supply.kind === "packaging").length,
    }),
    [supplies],
  );

  const query = normalize(search);
  const filtered = useMemo(() => {
    const byKind = supplies.filter((supply) => supply.kind === activeKind);
    if (!query) return byKind;

    return byKind.filter((supply) =>
      [supply.name, supply.purchaseUnit, supply.minimumUnit].some((value) =>
        normalize(value).includes(query),
      ),
    );
  }, [supplies, activeKind, query]);

  const handleTab = (kind: SupplyKind) => {
    setActiveKind(kind);
    setSearch("");
  };

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

  const formKind = editing?.kind ?? activeKind;
  const activeLabel = activeKind === "packaging" ? "Packaging" : "Insumos";
  const formTitle = `${editing ? "Editar" : "Nuevo"} ${
    formKind === "packaging" ? "packaging" : "insumo"
  }`;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Tipo de ítem"
        className="inline-flex gap-1 rounded-[14px] bg-surface-tint p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeKind === "supply"}
          onClick={() => handleTab("supply")}
          className={`${TAB_BASE} ${
            activeKind === "supply"
              ? "bg-surface text-fg shadow-sm"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          Insumos ({counts.supply})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeKind === "packaging"}
          onClick={() => handleTab("packaging")}
          className={`${TAB_BASE} ${
            activeKind === "packaging"
              ? "bg-surface text-fg shadow-sm"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          Packaging ({counts.packaging})
        </button>
      </div>

      <section
        aria-label={`Lista de ${activeLabel.toLowerCase()}`}
        className="min-w-0 space-y-4"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-fg">{activeLabel}</h2>
          <button
            type="button"
            onClick={handleNew}
            className="min-h-11 shrink-0 rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover active:bg-action-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            + Nuevo
          </button>
        </div>

        {counts[activeKind] > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="supplies-search" className="text-sm font-semibold text-fg-muted">
              Buscar
            </label>
            <input
              id="supplies-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, unidad de compra o unidad mínima…"
              className="min-h-11 w-full rounded-[10px] border border-border-control bg-surface px-4 py-2 text-base text-fg placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>
        )}

        <SuppliesTable
          supplies={filtered}
          kind={activeKind}
          onEdit={handleEdit}
          searchActive={query !== ""}
        />
      </section>

      {showForm && (
        <SuppliesModal title={formTitle} onClose={handleCancel}>
          <SuppliesForm
            kind={formKind}
            supply={editing}
            onCancel={handleCancel}
            onSaved={handleSaved}
          />
        </SuppliesModal>
      )}
    </div>
  );
}
