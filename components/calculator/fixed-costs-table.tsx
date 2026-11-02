"use client";

import { useEffect, useRef } from "react";

import type { FixedSubtotalResult } from "@/lib/calc/fixed-subtotal";
import { formatARS } from "@/lib/money/format";
import {
  FixedCostRowItem,
  type FixedCostRow,
  type FixedCostRowPatch,
} from "@/components/calculator/fixed-cost-row-item";

export type { FixedCostRow, FixedCostRowPatch };

type FixedCostsTableProps = {
  rows: readonly FixedCostRow[];
  subtotal: FixedSubtotalResult;
  onChangeRow: (id: string, patch: FixedCostRowPatch) => void;
  onAddRow: () => void;
};

function displaySubtotal(subtotal: FixedSubtotalResult): string {
  if (!subtotal.ok || subtotal.subtotal === null) {
    return "—";
  }

  return formatARS(subtotal.subtotal) || "—";
}

// The wizard shell (#170) forces a light colour scheme, so the table keeps
// dark text in both modes instead of flipping to light-on-light `dark:` styles.
export function FixedCostsTable({
  rows,
  subtotal,
  onChangeRow,
  onAddRow,
}: FixedCostsTableProps) {
  const conceptInputs = useRef(new Map<string, HTMLInputElement>());
  const knownRowIds = useRef<ReadonlySet<string>>(
    new Set(rows.map((row) => row.id)),
  );
  const pendingFocus = useRef(false);

  // onAddRow may update the rows synchronously or after a request. Focusing
  // from the new list (instead of from the click) covers both cases. The
  // request ends with the first change of the rows, whether or not it added
  // one, so a later unrelated row can never steal the focus.
  useEffect(() => {
    const previousIds = knownRowIds.current;
    knownRowIds.current = new Set(rows.map((row) => row.id));

    if (!pendingFocus.current) {
      return;
    }
    pendingFocus.current = false;

    const added = rows.filter((row) => !previousIds.has(row.id)).at(-1);
    if (added !== undefined) {
      conceptInputs.current.get(added.id)?.focus();
    }
  }, [rows]);

  useEffect(() => {
    return () => {
      pendingFocus.current = false;
    };
  }, []);

  const handleAddRow = () => {
    pendingFocus.current = true;
    onAddRow();
  };

  const subtotalText = displaySubtotal(subtotal);

  return (
    <div className="flex flex-col gap-5">
      <ul aria-label="Costos fijos del mes" className="flex flex-col">
        {rows.map((row) => (
          <FixedCostRowItem
            key={row.id}
            row={row}
            onChange={(patch) => onChangeRow(row.id, patch)}
            conceptRef={(input) => {
              if (input) {
                conceptInputs.current.set(row.id, input);
              } else {
                conceptInputs.current.delete(row.id);
              }
            }}
          />
        ))}
      </ul>

      <div className="flex flex-wrap items-baseline justify-between gap-2 border-y border-gray-200 py-4">
        <span className="text-sm font-semibold text-gray-900">
          Subtotal fijos
        </span>
        <span
          aria-label={`Subtotal fijos ${subtotalText}`}
          aria-live="polite"
          className="text-3xl font-bold text-brand-green-600"
        >
          {subtotalText}
        </span>
      </div>

      {!subtotal.ok && (
        <p role="alert" className="text-sm text-red-600">
          No pudimos calcular el subtotal. Revisá los importes.
        </p>
      )}

      <button
        type="button"
        onClick={handleAddRow}
        className="min-h-[54px] w-full rounded-[14px] border border-brand-green-500 bg-brand-green-50 px-4 py-3 text-base font-semibold text-brand-green-700 transition-colors hover:bg-brand-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600"
      >
        Agregar concepto
      </button>
    </div>
  );
}
