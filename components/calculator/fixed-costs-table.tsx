"use client";

import { useEffect, useId, useRef, useState } from "react";

import { formatARS, parseARS } from "@/lib/money/format";
import { amountField } from "@/lib/schemas/costs/fields";

export type FixedCostRow = {
  id: string;
  name: string;
  amount: string;
};

export type FixedCostRowValues = {
  name: string;
  amount: string;
};

type FixedCostsTableProps = {
  rows: readonly FixedCostRow[];
  subtotal: string;
  onChangeRow: (id: string, values: FixedCostRowValues) => void;
  onAddRow: () => void;
};

function firstIssueMessage(value: string): string | null {
  const result = amountField.safeParse(value);

  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

// parseARS decides whether the text is an Argentine amount; amountField owns
// the Spanish message when it is not. The candidate keeps the separators so
// "1234,567" reports the decimals instead of "not a number".
function amountCandidate(raw: string): string {
  const cleaned = raw.replace(/\s/g, "").replace(/^\$/, "");

  if (cleaned === "" || cleaned.startsWith("-")) {
    return cleaned;
  }

  const thousands = /^(\d{1,3}(?:\.\d{3})+)(?:,(\d+))?$/.exec(cleaned);
  if (thousands) {
    const integer = thousands[1].replace(/\./g, "");
    return thousands[2] === undefined ? integer : `${integer}.${thousands[2]}`;
  }

  const plain = /^(\d+)(?:[.,](\d+))?$/.exec(cleaned);
  if (plain) {
    return plain[2] === undefined ? plain[1] : `${plain[1]}.${plain[2]}`;
  }

  return cleaned;
}

function validateAmount(raw: string): {
  amount: string | null;
  error: string | null;
} {
  const parsed = parseARS(raw);

  if (parsed !== null) {
    const error = firstIssueMessage(parsed);
    return { amount: error === null ? parsed : null, error };
  }

  return { amount: null, error: firstIssueMessage(amountCandidate(raw)) };
}

function displayAmount(amount: string): string {
  if (amount === "") {
    return "";
  }

  return formatARS(amount) || amount;
}

function displaySubtotal(subtotal: string): string {
  if (subtotal === "") {
    return "—";
  }

  return formatARS(subtotal) || "—";
}

// The wizard shell (#170) forces a light colour scheme, so the table keeps
// dark text in both modes instead of flipping to light-on-light `dark:` styles.
export function FixedCostsTable({
  rows,
  subtotal,
  onChangeRow,
  onAddRow,
}: FixedCostsTableProps) {
  const baseId = useId();
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [touchedAmounts, setTouchedAmounts] = useState<Record<string, boolean>>(
    {},
  );
  const conceptInputs = useRef(new Map<string, HTMLInputElement>());
  const knownRowIds = useRef<ReadonlySet<string>>(
    new Set(rows.map((row) => row.id)),
  );
  const pendingFocus = useRef(false);

  // onAddRow may update the rows synchronously or after a request. Focusing
  // from the new list (instead of from the click) covers both cases.
  useEffect(() => {
    const currentIds = new Set(rows.map((row) => row.id));
    const previousIds = knownRowIds.current;
    knownRowIds.current = currentIds;

    if (!pendingFocus.current) {
      return;
    }

    const added = rows.filter((row) => !previousIds.has(row.id));
    const target = added.at(-1);
    if (target === undefined) {
      return;
    }

    const input = conceptInputs.current.get(target.id);
    if (input === undefined) {
      return;
    }

    input.focus();
    pendingFocus.current = false;
  }, [rows]);

  const handleAddRow = () => {
    pendingFocus.current = true;
    onAddRow();
  };

  const handleNameChange = (row: FixedCostRow, name: string) => {
    // Prefer the amount being edited: the parent may still be applying the
    // previous change, and sending its old value would undo it.
    const draft = amountDrafts[row.id];
    const amount =
      draft === undefined
        ? row.amount
        : (validateAmount(draft).amount ?? row.amount);

    onChangeRow(row.id, { name, amount });
  };

  const handleAmountFocus = (row: FixedCostRow) => {
    setAmountDrafts((current) => {
      const draft = current[row.id];
      if (draft === undefined) {
        return { ...current, [row.id]: row.amount };
      }

      // A formatted value left by the last blur is not an edit draft: show the
      // stored decimal again so the cursor edits the number, not the currency.
      const { amount } = validateAmount(draft);
      if (amount === null) {
        return current;
      }

      return { ...current, [row.id]: amount };
    });
  };

  const handleAmountChange = (row: FixedCostRow, value: string) => {
    setAmountDrafts((current) => ({ ...current, [row.id]: value }));
    setTouchedAmounts((current) => ({ ...current, [row.id]: true }));

    const { amount } = validateAmount(value);
    if (amount !== null) {
      onChangeRow(row.id, { name: row.name, amount });
    }
  };

  const handleAmountBlur = (row: FixedCostRow, value: string) => {
    setTouchedAmounts((current) => ({ ...current, [row.id]: true }));

    const { amount } = validateAmount(value);
    if (amount === null) {
      return;
    }

    setAmountDrafts((current) => ({
      ...current,
      [row.id]: formatARS(amount),
    }));
  };

  const subtotalText = displaySubtotal(subtotal);

  return (
    <div className="flex flex-col gap-5">
      <ul aria-label="Costos fijos del mes" className="flex flex-col">
        {rows.map((row) => {
          const conceptId = `${baseId}-${row.id}-concept`;
          const amountId = `${baseId}-${row.id}-amount`;
          const errorId = `${amountId}-error`;
          const amountText =
            amountDrafts[row.id] ?? displayAmount(row.amount);
          const amountError = touchedAmounts[row.id]
            ? validateAmount(amountText).error
            : null;

          return (
            <li
              key={row.id}
              className="border-b border-gray-200 py-1 last:border-b-0"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] items-start gap-2 sm:gap-3">
                <div className="min-w-0">
                  <label htmlFor={conceptId} className="sr-only">
                    Concepto
                  </label>
                  <input
                    ref={(input) => {
                      if (input) {
                        conceptInputs.current.set(row.id, input);
                      } else {
                        conceptInputs.current.delete(row.id);
                      }
                    }}
                    id={conceptId}
                    value={row.name}
                    onChange={(event) =>
                      handleNameChange(row, event.target.value)
                    }
                    placeholder="Concepto"
                    autoComplete="off"
                    className="w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[var(--brand-green-600,var(--color-green-600))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green-600,var(--color-green-600))]"
                  />
                </div>

                <div className="min-w-0">
                  <label htmlFor={amountId} className="sr-only">
                    Importe
                  </label>
                  <input
                    id={amountId}
                    value={amountText}
                    onChange={(event) =>
                      handleAmountChange(row, event.target.value)
                    }
                    onFocus={() => handleAmountFocus(row)}
                    onBlur={(event) =>
                      handleAmountBlur(row, event.target.value)
                    }
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="$ 0,00"
                    aria-invalid={amountError ? true : undefined}
                    aria-describedby={amountError ? errorId : undefined}
                    className="w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-2 text-right text-base font-medium tabular-nums text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[var(--brand-green-600,var(--color-green-600))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green-600,var(--color-green-600))]"
                  />
                </div>
              </div>

              {amountError && (
                <p
                  id={errorId}
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {amountError}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-baseline justify-between gap-2 border-y border-gray-200 py-4">
        <span className="text-sm font-semibold text-gray-900">
          Subtotal fijos
        </span>
        <span
          aria-label={`Subtotal fijos ${subtotalText}`}
          aria-live="polite"
          className="text-3xl font-bold text-[var(--brand-green-600,var(--color-green-600))]"
        >
          {subtotalText}
        </span>
      </div>

      <button
        type="button"
        onClick={handleAddRow}
        className="min-h-[54px] w-full rounded-[14px] border border-[var(--brand-green-500,var(--color-green-500))] bg-[var(--brand-green-50,var(--color-green-50))] px-4 py-3 text-base font-semibold text-[var(--brand-green-700,var(--color-green-700))] transition-colors hover:bg-[var(--brand-green-100,var(--color-green-100))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green-600,var(--color-green-600))]"
      >
        Agregar concepto
      </button>
    </div>
  );
}
