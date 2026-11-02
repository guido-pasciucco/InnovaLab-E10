"use client";

import { useCallback, useRef, useState } from "react";

import { formatARS } from "@/lib/money/format";
import {
  FixedCostRowItem,
  type FixedCostLine,
} from "@/components/calculator/fixed-cost-row-item";

type FixedCostsTableProps = {
  lines: readonly FixedCostLine[];
  // The server's sum of the lines, as a decimal string.
  totalFixed: string;
};

// The wizard shell (#170) forces a light colour scheme, so the table keeps
// dark text in both modes instead of flipping to light-on-light `dark:` styles.
export function FixedCostsTable({ lines, totalFixed }: FixedCostsTableProps) {
  // At most one new row is open at a time; saving it hands it over to the
  // server's list.
  const [adding, setAdding] = useState(false);
  const newConceptInput = useRef<HTMLInputElement | null>(null);
  const addButton = useRef<HTMLButtonElement | null>(null);

  // Nothing to add up yet: a dash reads better than a zero total.
  const subtotalText =
    lines.length === 0 ? "—" : formatARS(totalFixed) || "—";

  // Stable on purpose: React calls a ref callback again whenever its identity
  // changes, and the focus must only move when the new row mounts.
  const setNewConceptInput = useCallback((input: HTMLInputElement | null) => {
    newConceptInput.current = input;
    input?.focus();
  }, []);

  const handleAddRow = () => {
    if (adding) {
      newConceptInput.current?.focus();
      return;
    }
    setAdding(true);
  };

  // A deleted row takes its focus with it: the add button is the stable spot
  // that keeps keyboard and screen-reader users in the table.
  const focusAddButton = () => addButton.current?.focus();

  const handleDiscardNewRow = () => {
    setAdding(false);
    focusAddButton();
  };

  return (
    <div className="flex flex-col gap-5">
      <ul aria-label="Costos fijos del mes" className="flex flex-col">
        {lines.map((line) => (
          <FixedCostRowItem key={line.id} line={line} onRemoved={focusAddButton} />
        ))}
        {adding && (
          <FixedCostRowItem
            line={null}
            onSaved={() => setAdding(false)}
            onRemoved={handleDiscardNewRow}
            conceptRef={setNewConceptInput}
          />
        )}
      </ul>

      <div className="flex flex-wrap items-baseline justify-between gap-2 border-y border-border-default py-4">
        <span className="text-sm font-semibold text-fg">
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

      <button
        ref={addButton}
        type="button"
        onClick={handleAddRow}
        className="min-h-[54px] w-full rounded-[14px] border border-brand-green-500 bg-brand-green-50 px-4 py-3 text-base font-semibold text-brand-green-700 transition-colors hover:bg-brand-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600"
      >
        Agregar concepto
      </button>
    </div>
  );
}
