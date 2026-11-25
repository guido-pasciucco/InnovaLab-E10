"use client";import { Button } from "@/components/ui/button";


import { useMemo, useState, useTransition } from "react";

import { removePeriodCostLine } from "@/app/(business)/period-costs/actions";
import { CatalogModal } from "@/components/ui/catalog-modal";
import { normalizeForSearch } from "@/components/ui/normalize-search";
import { sumMoney } from "@/lib/money/sum";
import { formatPeriodLabel, type PeriodCostLineView } from "./period-costs-values";
import { PeriodCostsForm } from "./period-costs-form";
import { PeriodCostsTable } from "./period-costs-table";

type PeriodCostsCatalogProps = {
  period: string;
  lines: PeriodCostLineView[];
  // The server's sum, used until the first local mutation.
  total: string;
};

// Client wrapper of the Gastos del período screen (#285). It owns the list,
// the search, the single create/edit modal and the delete confirmation, the
// same way Insumos and Productos own theirs. The page shell (and its left
// sidebar) lives in the (business) layout, so this component only renders the
// catalog block.
export function PeriodCostsCatalog({
  period,
  lines: initialLines,
  total: initialTotal,
}: PeriodCostsCatalogProps) {
  const [lines, setLines] = useState(initialLines);
  const [total, setTotal] = useState(initialTotal);
  const [editing, setEditing] = useState<PeriodCostLineView | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const query = normalizeForSearch(search);
  const filtered = useMemo(() => {
    if (!query) return lines;
    return lines.filter((line) =>
      normalizeForSearch(line.concept).includes(query),
    );
  }, [lines, query]);

  const refreshTotal = (next: PeriodCostLineView[]) => {
    setLines(next);
    setTotal(sumMoney(next.map((line) => line.amountPeriod)));
  };

  const handleNew = () => {
    setEditing(null);
    setShowForm(true);
    setError(null);
    setStatus(null);
  };

  const handleEdit = (line: PeriodCostLineView) => {
    setEditing(line);
    setShowForm(true);
    setError(null);
    setStatus(null);
  };

  const handleCancel = () => {
    setEditing(null);
    setShowForm(false);
  };

  const handleSaved = (saved: PeriodCostLineView) => {
    const exists = lines.some((line) => line.id === saved.id);
    refreshTotal(
      exists
        ? lines.map((line) => (line.id === saved.id ? saved : line))
        : [...lines, saved],
    );
    setEditing(null);
    setShowForm(false);
    setError(null);
    setStatus(
      exists
        ? "Gasto actualizado."
        : "Gasto guardado en tu período.",
    );
  };

  const handleDelete = (line: PeriodCostLineView) => {
    if (!confirm(`¿Borrar «${line.concept}» de ${formatPeriodLabel(period)}?`)) return;

    setError(null);
    setStatus(null);

    startDelete(async () => {
      const result = await removePeriodCostLine(line.id);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      refreshTotal(lines.filter((item) => item.id !== line.id));
      setStatus(`«${line.concept}» se borró del período.`);
    });
  };

  const formTitle = `${editing ? "Editar" : "Nuevo"} gasto del período`;

  return (
    <div className="space-y-4">
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

      <section aria-label={`Gastos de ${formatPeriodLabel(period)}`} className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-fg">
            Gastos de {formatPeriodLabel(period)} ({filtered.length})
          </h2>
          <Button variant="primary" size="md"
            type="button"
            onClick={handleNew}
            disabled={isDeleting}
            className="min-h-11! shrink-0! rounded-[14px]! bg-action-primary! px-5! py-2! text-sm! font-semibold! text-on-action-primary! hover:bg-action-primary-hover! active:bg-action-primary-pressed! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:cursor-not-allowed! disabled:opacity-50!"
          >
            + Nuevo
          </Button>
        </div>

        <div
          role="note"
          className="flex flex-col gap-3 rounded-[16px] border border-border-tonal bg-surface-tint px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-fg">
            ¿Cargaste tu trabajo del mes? Tu sueldo también es un gasto del período: sumalo como un gasto más para que el cálculo te dé el número real.
          </p>
          <button
            type="button"
            onClick={handleNew}
            disabled={isDeleting}
            className="min-h-11 w-full shrink-0 rounded-[14px] border border-border-control bg-surface px-4 py-2 text-sm font-semibold text-fg hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Cargar mi sueldo
          </button>
        </div>

        {lines.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="period-costs-search" className="text-sm font-semibold text-fg-muted">
              Buscar
            </label>
            <input
              id="period-costs-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Concepto del gasto…"
              className="min-h-11 w-full rounded-[10px] border border-border-control bg-surface px-4 py-2 text-base text-fg placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>
        )}

        <PeriodCostsTable
          lines={filtered}
          total={total}
          busy={isDeleting}
          searchActive={query !== ""}
          hasLines={lines.length > 0}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </section>

      {showForm && (
        <CatalogModal title={formTitle} onClose={handleCancel}>
          <PeriodCostsForm
            key={editing?.id ?? "new"}
            period={period}
            line={editing}
            onCancel={handleCancel}
            onSaved={handleSaved}
          />
        </CatalogModal>
      )}
    </div>
  );
}
