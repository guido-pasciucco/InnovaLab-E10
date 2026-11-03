"use client";

import { useId, useState, useTransition, type FocusEvent } from "react";

import { saveOwnLabor } from "@/app/(calculator)/paso-4/actions";
import { formatARSCompact, parseAmountInput } from "@/lib/money/format";
import { hoursField } from "@/lib/schemas/costs/fields";

type OwnLaborInputsProps = {
  // The saved values, normalized by the server. null: nothing typed yet.
  hours: string | null;
  hourlyRate: string | null;
  // The saved product, "0.00" until both values are valid.
  amount: string;
};

const INPUT_CLASS =
  "w-full min-w-0 rounded-md border border-border-control bg-surface px-3 py-2 text-base text-fg tabular-nums placeholder:text-placeholder focus:border-brand-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600";

const SAVE_FAILED = "No pudimos guardar tu trabajo propio. Probá de nuevo.";

type Parsed = { value: string | null; issue: string | null };

// Empty is a valid answer: the server keeps the line with amount 0.
function parseHours(text: string): Parsed {
  if (text.trim() === "") return { value: null, issue: null };
  const result = hoursField.safeParse(text.trim().replace(",", "."));
  return result.success
    ? { value: result.data, issue: null }
    : { value: null, issue: result.error.issues[0]?.message ?? "Las horas no son válidas." };
}

function parseRate(text: string): Parsed {
  if (text.trim() === "") return { value: null, issue: null };
  const { amount, issue } = parseAmountInput(text);
  return { value: amount, issue };
}

// The two values save together when focus leaves the group, so a half-typed
// pair (hours first, rate next) is not saved early. A failed save keeps the
// typed text and retries the next time focus leaves the group.
export function OwnLaborInputs({ hours, hourlyRate, amount }: OwnLaborInputsProps) {
  const id = useId();
  const hoursId = `${id}-hours`;
  const rateId = `${id}-rate`;
  const hoursErrorId = `${hoursId}-error`;
  const rateErrorId = `${rateId}-error`;

  // null: nothing is being edited, so the field shows the stored value.
  const [hoursDraft, setHoursDraft] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hoursText = hoursDraft ?? hours ?? "";
  const rateText = rateDraft ?? (hourlyRate === null ? "" : formatARSCompact(hourlyRate));
  const parsedHours = parseHours(hoursText);
  const parsedRate = parseRate(rateText);
  const hoursIssue = touched ? parsedHours.issue : null;
  const rateIssue = touched ? parsedRate.issue : null;

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    // Moving between the two fields is not leaving the group.
    if (event.currentTarget.contains(event.relatedTarget)) return;
    if (isPending || !dirty) return;

    setTouched(true);
    if (parsedHours.issue !== null || parsedRate.issue !== null) return;

    startTransition(async () => {
      const result = await saveOwnLabor({
        hours: parsedHours.value,
        hourlyRate: parsedRate.value,
      });

      if (result.ok) {
        setDirty(false);
        setSaveError(null);
      } else {
        setSaveError(SAVE_FAILED);
      }
    });
  };

  const handleChange = (field: "hours" | "rate", value: string) => {
    if (field === "hours") setHoursDraft(value);
    else setRateDraft(value);
    setDirty(true);
    setTouched(false);
    setSaveError(null);
  };

  return (
    <div onBlur={handleBlur} aria-busy={isPending || undefined} className="mt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={hoursId} className="text-sm font-semibold text-fg">
            Horas del mes
          </label>
          <input
            id={hoursId}
            value={hoursText}
            onChange={(event) => handleChange("hours", event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            aria-invalid={hoursIssue ? true : undefined}
            aria-describedby={hoursIssue ? hoursErrorId : undefined}
            className={`mt-1 ${INPUT_CLASS}`}
          />
          {hoursIssue && (
            <p id={hoursErrorId} role="alert" className="mt-1 text-sm text-danger">
              {hoursIssue}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <label htmlFor={rateId} className="text-sm font-semibold text-fg">
            Valor por hora
          </label>
          <input
            id={rateId}
            value={rateText}
            onChange={(event) => handleChange("rate", event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            placeholder="$0"
            aria-invalid={rateIssue ? true : undefined}
            aria-describedby={rateIssue ? rateErrorId : undefined}
            className={`mt-1 ${INPUT_CLASS}`}
          />
          {rateIssue && (
            <p id={rateErrorId} role="alert" className="mt-1 text-sm text-danger">
              {rateIssue}
            </p>
          )}
        </div>
      </div>

      {saveError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {saveError}
        </p>
      )}

      <div className="mt-4 flex items-baseline justify-between gap-2 border-y border-border-default py-3">
        <span className="text-base font-medium text-fg">Trabajo propio</span>
        <span aria-live="polite" className="text-xl font-bold tabular-nums text-fg">
          {formatARSCompact(amount) || amount}
        </span>
      </div>
    </div>
  );
}
