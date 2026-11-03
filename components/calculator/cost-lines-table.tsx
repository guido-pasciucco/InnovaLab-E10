"use client";

import { useCallback, useRef, useState } from "react";

import { formatARSCompact } from "@/lib/money/format";
import {
  CostLineRowItem,
  costLineGridClass,
  type CostLine,
  type CostLineActions,
} from "@/components/calculator/cost-line-row-item";

type CostLinesTableProps = {
  lines: readonly CostLine[];
  // The server's sum of the lines, as a decimal string.
  total: string;
  actions: CostLineActions;
  // Names the list for screen readers, e.g. "Costos fijos del mes".
  listLabel: string;
  // Caption of the sum under the list, e.g. "Subtotal fijos".
  subtotalLabel: string;
  // Forwarded to each row: see CostLineRowItem.
  amountLabel?: string;
  yieldUnit?: string;
};

// The wizard shell (#170) forces a light colour scheme, so the table keeps
// dark text in both modes instead of flipping to light-on-light `dark:` styles.
export function CostLinesTable({
  lines,
  total,
  actions,
  listLabel,
  subtotalLabel,
  amountLabel,
  yieldUnit,
}: CostLinesTableProps) {
  // At most one new row is open at a time; saving it hands it over to the
  // server's list.
  const [adding, setAdding] = useState(false);
  // The id the server gave the row just saved. The row stays on screen, locked,
  // until `lines` brings that line, so the swap never leaves a gap.
  const [savedId, setSavedId] = useState<string | null>(null);
  if (savedId !== null && lines.some((line) => line.id === savedId)) {
    setSavedId(null);
    setAdding(false);
  }
  const newConceptInput = useRef<HTMLInputElement | null>(null);
  const addButton = useRef<HTMLButtonElement | null>(null);

  // Nothing to add up yet: a dash reads better than a zero total.
  const subtotalText =
    lines.length === 0 ? "—" : formatARSCompact(total) || "—";

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
    <div className="flex flex-col gap-5 short:gap-3">
      {/* Visual column titles only: each input keeps its own label. They sit
          outside the scroll box so they stay put while the rows scroll; the
          shared gutter keeps their columns aligned with the scrolled rows. */}
      {(lines.length > 0 || adding) && (
        <div
          aria-hidden="true"
          className={`${costLineGridClass(yieldUnit !== undefined)} -mb-5 short:-mb-3 overflow-y-hidden border-b border-border-default pb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted [scrollbar-gutter:stable]`}
        >
          <span className="px-2">Concepto</span>
          <span className="px-2 text-right">{amountLabel ?? "Importe"}</span>
          {yieldUnit !== undefined && (
            <span className="hidden sm:block">Rinde para</span>
          )}
        </div>
      )}
      {/* The rows get whatever height the viewport leaves after the step's
          header, subtotal, add button and nav, so the whole step fits on
          screen and a long list scrolls inside its own box. */}
      <ul
        aria-label={listLabel}
        className="flex max-h-[max(12rem,calc(100dvh-42rem))] flex-col overflow-y-auto overscroll-contain scrollbar-brand [scrollbar-gutter:stable]"
      >
        {lines.map((line) => (
          <CostLineRowItem
            key={line.id}
            actions={actions}
            line={line}
            onRemoved={focusAddButton}
            amountLabel={amountLabel}
            yieldUnit={yieldUnit}
          />
        ))}
        {adding && (
          <CostLineRowItem
            actions={actions}
            line={null}
            onSaved={setSavedId}
            onRemoved={handleDiscardNewRow}
            conceptRef={setNewConceptInput}
            amountLabel={amountLabel}
            yieldUnit={yieldUnit}
          />
        )}
      </ul>

      <div className="flex flex-wrap items-baseline justify-between gap-2 border-y border-border-default py-4 short:py-2">
        <span className="text-sm font-semibold text-fg">
          {subtotalLabel}
        </span>
        <span
          aria-label={`${subtotalLabel} ${subtotalText}`}
          aria-live="polite"
          className="text-3xl font-bold text-brand-green-600 short:text-2xl"
        >
          {subtotalText}
        </span>
      </div>

      <button
        ref={addButton}
        type="button"
        onClick={handleAddRow}
        className="min-h-[54px] short:min-h-11 w-full rounded-[14px] border border-brand-green-500 bg-brand-green-50 px-4 py-3 short:py-2 text-base font-semibold text-brand-green-700 transition-colors hover:bg-brand-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600"
      >
        Agregar concepto
      </button>
    </div>
  );
}
