"use client";import { Button } from "@/components/ui/button";


import { useMemo, useState } from "react";

import type { SupplyKind } from "@/lib/schemas/supplies/fields";
import type { SupplyItem } from "@/lib/schemas/supplies/supplies";
import { getSupplyUnitBasis } from "@/lib/schemas/supplies/units";
import { CatalogModal } from "@/components/ui/catalog-modal";
import { normalizeForSearch } from "@/components/ui/normalize-search";
import { SuppliesForm } from "./supplies-form";
import { SuppliesTable } from "./supplies-table";

function minimumUnitOf(purchaseUnit: string): string {
  return getSupplyUnitBasis(purchaseUnit)?.minimumUnit ?? "";
}

type SuppliesCatalogProps = {
  supplies: SupplyItem[];
};

const TAB_BASE =
  "min-h-10! rounded-[10px]! px-4! py-1.5! text-sm! font-semibold! transition! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus!";

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

  const query = normalizeForSearch(search);
  const filtered = useMemo(() => {
    const byKind = supplies.filter((supply) => supply.kind === activeKind);
    if (!query) return byKind;

    return byKind.filter((supply) =>
      [supply.name, supply.purchaseUnit, minimumUnitOf(supply.purchaseUnit)].some((value) =>
        normalizeForSearch(value).includes(query),
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
    <div className="min-w-0 space-y-4">
      <div
        role="tablist"
        aria-label="Tipo de ítem"
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border-default bg-surface p-1 shadow-sm"
      >
        <Button variant="ghost" size="sm"
          type="button"
          role="tab"
          aria-selected={activeKind === "supply"}
          onClick={() => handleTab("supply")}
          className={`${TAB_BASE} ${
            activeKind === "supply"
              ? "bg-surface! text-fg! shadow-sm!"
              : "text-fg-muted! hover:text-fg!"
          }`}
        >
          Insumos ({counts.supply})
        </Button>
        <Button variant="ghost" size="sm"
          type="button"
          role="tab"
          aria-selected={activeKind === "packaging"}
          onClick={() => handleTab("packaging")}
          className={`${TAB_BASE} ${
            activeKind === "packaging"
              ? "bg-surface! text-fg! shadow-sm!"
              : "text-fg-muted! hover:text-fg!"
          }`}
        >
          Packaging ({counts.packaging})
        </Button>
      </div>

      <section
        aria-label={`Lista de ${activeLabel.toLowerCase()}`}
        className="min-w-0 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-fg">{activeLabel}</h2>
            <p className="mt-0.5 text-xs text-fg-muted">{filtered.length} {filtered.length === 1 ? "ítem" : "ítems"}</p>
          </div>
          <Button variant="primary" size="md"
            type="button"
            onClick={handleNew}
            className="min-h-10! shrink-0! rounded-xl! bg-action-primary! px-4! py-2! text-sm! font-semibold! text-on-action-primary! hover:bg-action-primary-hover! active:bg-action-primary-pressed! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus!"
          >
            + Nuevo
          </Button>
        </div>

        {counts[activeKind] > 0 && (
          <div className="flex max-w-2xl flex-col gap-1">
            <label htmlFor="supplies-search" className="text-sm font-semibold text-fg-muted">
              Buscar
            </label>
            <input
              id="supplies-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, unidad de compra o unidad mínima…"
              className="min-h-10 w-full rounded-xl border border-border-control bg-surface px-3.5 py-2 text-sm text-fg placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>
        )}

        <SuppliesTable
          supplies={filtered}
          kind={activeKind}
          onEdit={handleEdit}
          searchActive={query !== ""}
        />

        {counts[activeKind] > 0 && (
          <p className="text-xs text-fg-muted">
            El costo por unidad mínima se calcula automáticamente a partir de la cantidad y el precio de compra. No se cargan cuentas a mano.
          </p>
        )}
      </section>

      {showForm && (
        <CatalogModal title={formTitle} onClose={handleCancel}>
          <SuppliesForm
            kind={formKind}
            supply={editing}
            onCancel={handleCancel}
            onSaved={handleSaved}
          />
        </CatalogModal>
      )}
    </div>
  );
}
