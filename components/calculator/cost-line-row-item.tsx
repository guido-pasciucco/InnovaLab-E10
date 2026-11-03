"use client";

import {
  useId,
  useRef,
  useState,
  useTransition,
  type FocusEvent,
  type Ref,
} from "react";

import { CostLineDeleteButton } from "@/components/calculator/cost-line-delete-button";
import type { ServiceResult } from "@/lib/errors/catalog";
import { conceptField, yieldField } from "@/lib/schemas/costs/fields";
import { formatARSCompact, parseAmountInput } from "@/lib/money/format";

// What the table shows of a saved line. The server owns the id and the amount.
// `yieldQuantity` is only sent for variable lines (paso 3).
export type CostLine = {
  id: string;
  concept: string;
  amount: string;
  yieldQuantity?: string;
};

// The writes a row can make. Each step passes its own Server Actions, so the
// same row serves fixed and variable lines.
export type CostLineActions = {
  add: (input: {
    concept: string;
    amount: string;
    yieldQuantity?: string;
  }) => Promise<ServiceResult<{ id: string }>>;
  rename: (
    lineId: string,
    input: { concept: string },
  ) => Promise<ServiceResult<{ id: string }>>;
  updateAmount: (
    lineId: string,
    input: { amount: string },
  ) => Promise<ServiceResult<{ id: string }>>;
  remove: (lineId: string) => Promise<ServiceResult<{ id: string }>>;
  // Only steps whose lines carry a yield (paso 3) pass it.
  updateYield?: (
    lineId: string,
    input: { yieldQuantity: string },
  ) => Promise<ServiceResult<{ id: string }>>;
};

type CostLineRowItemProps = {
  actions: CostLineActions;
  // null: a new row the user is still filling in.
  line: CostLine | null;
  // A new row saved: it stays on screen, locked, until the server's list
  // brings the saved line (the table swaps them), so it never blinks out.
  onSaved?: (id: string) => void;
  // The row is gone: a saved line deleted on the server, or a new row discarded.
  onRemoved?: () => void;
  conceptRef?: Ref<HTMLInputElement>;
  // Screen-reader name of the amount input, e.g. "Importe de compra".
  amountLabel?: string;
  // The product unit of the setup. When set, the row asks how many of those
  // units the amount yields ("Rinde para N <unit>").
  yieldUnit?: string;
};

const INPUT_BASE =
  "w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-2 text-base text-fg transition-colors placeholder:text-placeholder hover:border-border-control focus:border-brand-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600";
const AMOUNT_INPUT_CLASS = `${INPUT_BASE} text-right font-medium tabular-nums`;

const SAVE_FAILED = "No pudimos guardar el costo. Probá de nuevo.";
const DELETE_FAILED = "No pudimos eliminar el costo. Probá de nuevo.";

const DEFAULT_YIELD = "1";

// The message conceptField gives for the text, or null when it is valid.
function firstIssue(concept: string): string | null {
  const result = conceptField.safeParse(concept);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

// The yield as yieldField accepts it (a decimal comma becomes a point), or the
// message it gives.
function parseYieldInput(text: string): { value: string | null; issue: string | null } {
  const result = yieldField.safeParse(text.trim().replace(",", "."));
  return result.success
    ? { value: result.data, issue: null }
    : { value: null, issue: result.error.issues[0]?.message ?? null };
}

function displayAmount(amount: string): string {
  return formatARSCompact(amount) || amount;
}

// The row keeps what the user is typing and saves it when focus leaves the
// row, so a half-typed line (concept first, amount next) is never saved early.
// A saved line saves only the fields that changed and are valid, one action
// each: if one fails the other stays applied. Failed saves keep the typed text
// and can be retried by leaving the row again.
export function CostLineRowItem({
  actions,
  line,
  onSaved,
  onRemoved,
  conceptRef,
  amountLabel = "Importe",
  yieldUnit,
}: CostLineRowItemProps) {
  const id = useId();
  const conceptId = `${id}-concept`;
  const amountId = `${id}-amount`;
  const yieldId = `${id}-yield`;
  const amountErrorId = `${amountId}-error`;
  const conceptErrorId = `${conceptId}-error`;
  const yieldErrorId = `${yieldId}-error`;
  const withYield = yieldUnit !== undefined;

  // null: nothing is being edited, so the field shows the stored value.
  const [conceptDraft, setConceptDraft] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [conceptDirty, setConceptDirty] = useState(false);
  const [amountDirty, setAmountDirty] = useState(false);
  const [yieldDraft, setYieldDraft] = useState<string | null>(null);
  const [yieldDirty, setYieldDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // A new row the server accepted, still waiting for the refreshed list.
  const [saved, setSaved] = useState(false);
  // Set once the row is deleted or discarded: the focus that leaves it then
  // must not save an edit to a row that no longer exists.
  const gone = useRef(false);

  const isNew = line === null;
  const conceptText = conceptDraft ?? line?.concept ?? "";
  const amountText = amountDraft ?? (line ? displayAmount(line.amount) : "");
  const busy = isPending || saved;
  const yieldText = yieldDraft ?? line?.yieldQuantity ?? DEFAULT_YIELD;
  const { amount: parsedAmount, issue } = parseAmountInput(amountText);
  const { value: parsedYield, issue: yieldIssue } = parseYieldInput(yieldText);
  const yieldError = withYield && touched ? yieldIssue : null;
  const conceptIssue = touched ? firstIssue(conceptText) : null;
  // Empty is no error on a saved line or a blank new one; it is on a new row
  // that already has a concept and was left without an amount.
  const amountError =
    touched && (amountText.trim() !== "" || (isNew && conceptText.trim() !== ""))
      ? issue
      : null;

  const handleConceptChange = (value: string) => {
    setConceptDraft(value);
    setConceptDirty(true);
    setTouched(false);
    setSaveError(null);
  };

  const handleAmountChange = (value: string) => {
    setAmountDraft(value);
    setAmountDirty(true);
    setTouched(false);
    setSaveError(null);
  };

  const handleYieldChange = (value: string) => {
    setYieldDraft(value);
    setYieldDirty(true);
    setTouched(false);
    setSaveError(null);
  };

  const saveNew = (concept: string, amount: string, yieldQuantity: string | null) => {
    startTransition(async () => {
      const result = await actions.add(
        yieldQuantity === null ? { concept, amount } : { concept, amount, yieldQuantity },
      );

      if (!result.ok) {
        setSaveError(SAVE_FAILED);
        return;
      }

      // Show the amount the way the saved line will, so the text does not jump.
      setAmountDraft(displayAmount(amount));
      setSaved(true);
      onSaved?.(result.data.id);
    });
  };

  // null: that field is not saved, either unchanged or still invalid.
  const saveChanges = (
    saved: CostLine,
    concept: string | null,
    amount: string | null,
    yieldQuantity: string | null,
  ) => {
    startTransition(async () => {
      let failed = false;

      if (concept !== null) {
        const result = await actions.rename(saved.id, { concept });
        if (result.ok) {
          setConceptDirty(false);
          setConceptDraft(concept);
        } else {
          failed = true;
        }
      }

      if (amount !== null) {
        const result = await actions.updateAmount(saved.id, { amount });
        if (result.ok) {
          setAmountDirty(false);
          setAmountDraft(displayAmount(amount));
        } else {
          failed = true;
        }
      }

      if (yieldQuantity !== null && actions.updateYield) {
        const result = await actions.updateYield(saved.id, { yieldQuantity });
        if (result.ok) {
          setYieldDirty(false);
          setYieldDraft(yieldQuantity);
        } else {
          failed = true;
        }
      }

      if (failed) setSaveError(SAVE_FAILED);
    });
  };

  const handleRowBlur = (event: FocusEvent<HTMLLIElement>) => {
    // Moving between the fields of this row is not leaving it.
    if (event.currentTarget.contains(event.relatedTarget)) return;
    if (busy || gone.current) return;

    const conceptValid = firstIssue(conceptText) === null;

    if (line === null) {
      if (conceptText.trim() === "" && amountText.trim() === "") return;
      setTouched(true);
      if (conceptValid && parsedAmount !== null && (!withYield || parsedYield !== null)) {
        saveNew(conceptText.trim(), parsedAmount, withYield ? parsedYield : null);
      }
      return;
    }

    if (!conceptDirty && !amountDirty && !yieldDirty) return;
    setTouched(true);

    const concept = conceptDirty && conceptValid ? conceptText.trim() : null;
    const amount = amountDirty ? parsedAmount : null;
    const yieldQuantity = withYield && yieldDirty ? parsedYield : null;
    if (concept === null && amount === null && yieldQuantity === null) return;

    saveChanges(line, concept, amount, yieldQuantity);
  };

  const handleRemove = () => {
    if (busy) return;

    if (line === null) {
      gone.current = true;
      onRemoved?.();
      return;
    }

    setSaveError(null);
    startTransition(async () => {
      const result = await actions.remove(line.id);

      if (!result.ok) {
        setSaveError(DELETE_FAILED);
        return;
      }

      gone.current = true;
      onRemoved?.();
    });
  };

  return (
    <li
      onBlur={handleRowBlur}
      aria-busy={busy || undefined}
      className={`border-b border-border-default py-1 transition-opacity duration-200 last:border-b-0 ${busy ? "opacity-60" : ""}`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_2.75rem] items-start gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_2.75rem] sm:gap-3">
        <div className="min-w-0">
          <label htmlFor={conceptId} className="sr-only">
            Concepto
          </label>
          <input
            ref={conceptRef}
            id={conceptId}
            value={conceptText}
            onChange={(event) => handleConceptChange(event.target.value)}
            placeholder="Concepto"
            readOnly={saved}
            autoComplete="off"
            aria-invalid={conceptIssue ? true : undefined}
            aria-describedby={conceptIssue ? conceptErrorId : undefined}
            className={INPUT_BASE}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor={amountId} className="sr-only">
            {amountLabel}
          </label>
          <input
            id={amountId}
            value={amountText}
            onChange={(event) => handleAmountChange(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            placeholder="$0"
            readOnly={saved}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={amountError ? amountErrorId : undefined}
            className={AMOUNT_INPUT_CLASS}
          />
        </div>

        <CostLineDeleteButton
          label={line ? `Eliminar ${line.concept}` : "Eliminar fila"}
          onClick={handleRemove}
          disabled={busy}
        />
      </div>

      {withYield && (
        <div className="flex items-center gap-2 px-2 pb-1 text-sm text-fg-muted">
          <label htmlFor={yieldId}>Rinde para</label>
          <div className="w-24 flex-none">
            <input
              id={yieldId}
              value={yieldText}
              onChange={(event) => handleYieldChange(event.target.value)}
              inputMode="decimal"
              autoComplete="off"
              readOnly={saved}
              aria-invalid={yieldError ? true : undefined}
              aria-describedby={yieldError ? yieldErrorId : undefined}
              className={AMOUNT_INPUT_CLASS}
            />
          </div>
          <span className="min-w-0 truncate">{yieldUnit}</span>
        </div>
      )}

      {conceptIssue && (
        <p id={conceptErrorId} role="alert" className="mt-1 text-sm text-danger">
          {conceptIssue}
        </p>
      )}
      {amountError && (
        <p id={amountErrorId} role="alert" className="mt-1 text-sm text-danger">
          {amountError}
        </p>
      )}
      {yieldError && (
        <p id={yieldErrorId} role="alert" className="mt-1 text-sm text-danger">
          {yieldError}
        </p>
      )}
      {saveError && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {saveError}
        </p>
      )}
    </li>
  );
}
