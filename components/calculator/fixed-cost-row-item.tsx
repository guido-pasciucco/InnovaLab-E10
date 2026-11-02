"use client";

import { useId, useState, useTransition, type FocusEvent, type Ref } from "react";

import {
  addFixedCostLine,
  updateFixedCostAmount,
} from "@/app/(calculator)/paso-2/actions";
import { conceptField } from "@/lib/schemas/costs/fields";
import { formatARS, parseAmountInput } from "@/lib/money/format";

// What the table shows of a saved line. The server owns the id and the amount.
export type FixedCostLine = {
  id: string;
  concept: string;
  amount: string;
};

type FixedCostRowItemProps = {
  // null: a new row the user is still filling in.
  line: FixedCostLine | null;
  // A new row saved: the table closes it and the server's line replaces it.
  onSaved?: () => void;
  conceptRef?: Ref<HTMLInputElement>;
};

const INPUT_BASE =
  "w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-brand-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600";
const AMOUNT_INPUT_CLASS = `${INPUT_BASE} text-right font-medium tabular-nums`;

const SAVE_FAILED = "No pudimos guardar el costo. Probá de nuevo.";

// The message conceptField gives for the text, or null when it is valid.
function firstIssue(concept: string): string | null {
  const result = conceptField.safeParse(concept);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

function displayAmount(amount: string): string {
  return formatARS(amount) || amount;
}

// The row keeps what the user is typing and saves it when focus leaves the
// row, so a half-typed line (concept first, amount next) is never saved early.
// A saved line keeps its concept as plain text: the service can only change
// the amount. Failed saves keep the typed text and can be retried by leaving
// the row again.
export function FixedCostRowItem({
  line,
  onSaved,
  conceptRef,
}: FixedCostRowItemProps) {
  const id = useId();
  const conceptId = `${id}-concept`;
  const amountId = `${id}-amount`;
  const amountErrorId = `${amountId}-error`;
  const conceptErrorId = `${conceptId}-error`;

  const [concept, setConcept] = useState("");
  // null: nothing is being edited, so the field shows the stored amount.
  const [draft, setDraft] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isNew = line === null;
  const amountText = draft ?? (line ? displayAmount(line.amount) : "");
  const { amount: parsedAmount, issue } = parseAmountInput(amountText);
  const conceptIssue = touched && isNew ? firstIssue(concept) : null;
  // Empty is no error on a saved line or a blank new one; it is on a new row
  // that already has a concept and was left without an amount.
  const amountError =
    touched && (amountText.trim() !== "" || (isNew && concept.trim() !== ""))
      ? issue
      : null;

  const handleChange = (value: string) => {
    setDraft(value);
    setDirty(true);
    setTouched(false);
    setSaveError(null);
  };

  const save = (amount: string) => {
    startTransition(async () => {
      const result = isNew
        ? await addFixedCostLine({ concept, amount })
        : await updateFixedCostAmount(line.id, { amount });

      if (!result.ok) {
        setSaveError(SAVE_FAILED);
        return;
      }

      setDirty(false);
      setDraft(formatARS(amount) || amount);
      onSaved?.();
    });
  };

  const handleRowBlur = (event: FocusEvent<HTMLLIElement>) => {
    // Moving between the fields of this row is not leaving it.
    if (event.currentTarget.contains(event.relatedTarget)) return;
    if (isPending) return;
    if (isNew ? concept.trim() === "" && amountText.trim() === "" : !dirty) return;

    setTouched(true);
    if (firstIssue(concept) !== null && isNew) return;
    if (parsedAmount === null) return;

    save(parsedAmount);
  };

  return (
    <li
      onBlur={handleRowBlur}
      aria-busy={isPending || undefined}
      className="border-b border-gray-200 py-1 last:border-b-0"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] items-start gap-2 sm:gap-3">
        <div className="min-w-0">
          {isNew ? (
            <>
              <label htmlFor={conceptId} className="sr-only">
                Concepto
              </label>
              <input
                ref={conceptRef}
                id={conceptId}
                value={concept}
                onChange={(event) => {
                  setConcept(event.target.value);
                  setTouched(false);
                  setSaveError(null);
                }}
                placeholder="Concepto"
                autoComplete="off"
                aria-invalid={conceptIssue ? true : undefined}
                aria-describedby={conceptIssue ? conceptErrorId : undefined}
                className={INPUT_BASE}
              />
            </>
          ) : (
            <p className="px-2 py-2 text-base text-gray-900">{line.concept}</p>
          )}
        </div>

        <div className="min-w-0">
          <label htmlFor={amountId} className="sr-only">
            Importe
          </label>
          <input
            id={amountId}
            value={amountText}
            onChange={(event) => handleChange(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            placeholder="$ 0,00"
            aria-invalid={amountError ? true : undefined}
            aria-describedby={amountError ? amountErrorId : undefined}
            className={AMOUNT_INPUT_CLASS}
          />
        </div>
      </div>

      {conceptIssue && (
        <p id={conceptErrorId} role="alert" className="mt-1 text-sm text-red-600">
          {conceptIssue}
        </p>
      )}
      {amountError && (
        <p id={amountErrorId} role="alert" className="mt-1 text-sm text-red-600">
          {amountError}
        </p>
      )}
      {saveError && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {saveError}
        </p>
      )}
    </li>
  );
}

