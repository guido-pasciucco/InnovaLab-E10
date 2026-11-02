"use client";

import { useId, useState, type Ref } from "react";

import { formatARS, parseAmountInput } from "@/lib/money/format";

// Hand-written on purpose: calcCostLineSchema (lib/schemas/costs) models a
// persisted line (`concept`, `behavior`, `traceability`, `isOwnLabor`), while
// this is a draft row of one step, labelled `name`, whose dimensions are fixed
// by calculateFixedSubtotal. `id` is temporary: the server owns ids once #176
// persists the rows (lib/AGENTS.md, rule 6).
export type FixedCostRow = {
  id: string;
  name: string;
  amount: string;
};

export type FixedCostRowPatch = Partial<Omit<FixedCostRow, "id">>;

type FixedCostRowItemProps = {
  row: FixedCostRow;
  onChange: (patch: FixedCostRowPatch) => void;
  conceptRef?: Ref<HTMLInputElement>;
};

const INPUT_BASE =
  "w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-brand-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600";
const AMOUNT_INPUT_CLASS = `${INPUT_BASE} text-right font-medium tabular-nums`;

function displayAmount(amount: string): string {
  return formatARS(amount) || amount;
}

// The row owns what is being typed in the amount field (`draft`) and whether
// the user already left it (`touched`). The parent only ever receives a valid
// amount, or "" while the text is empty or invalid, so a stale amount can never
// keep counting in the subtotal.
export function FixedCostRowItem({
  row,
  onChange,
  conceptRef,
}: FixedCostRowItemProps) {
  const id = useId();
  const conceptId = `${id}-concept`;
  const amountId = `${id}-amount`;
  const errorId = `${amountId}-error`;

  // null: nothing is being edited, so the field shows the stored amount.
  const [draft, setDraft] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const amountText = draft ?? displayAmount(row.amount);
  const { issue } = parseAmountInput(amountText);
  // Empty is not an error: a new row starts blank and is simply left out.
  const amountError = touched && amountText.trim() !== "" ? issue : null;

  const handleFocus = () => {
    // Edit the plain number, not the currency text left by the last blur.
    setDraft((current) => current ?? row.amount);
  };

  const handleChange = (value: string) => {
    setDraft(value);
    setTouched(false);
    onChange({ amount: parseAmountInput(value).amount ?? "" });
  };

  const handleBlur = () => {
    setTouched(true);

    // A valid draft is done: show the stored amount, formatted, from here on.
    if (draft !== null && parseAmountInput(draft).amount !== null) {
      setDraft(null);
    }
  };

  return (
    <li className="border-b border-gray-200 py-1 last:border-b-0">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] items-start gap-2 sm:gap-3">
        <div className="min-w-0">
          <label htmlFor={conceptId} className="sr-only">
            Concepto
          </label>
          <input
            ref={conceptRef}
            id={conceptId}
            value={row.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Concepto"
            autoComplete="off"
            className={INPUT_BASE}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor={amountId} className="sr-only">
            Importe
          </label>
          <input
            id={amountId}
            value={amountText}
            onChange={(event) => handleChange(event.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            inputMode="decimal"
            autoComplete="off"
            placeholder="$ 0,00"
            aria-invalid={amountError ? true : undefined}
            aria-describedby={amountError ? errorId : undefined}
            className={AMOUNT_INPUT_CLASS}
          />
        </div>
      </div>

      {amountError && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {amountError}
        </p>
      )}
    </li>
  );
}
