"use client";

import { Button } from "@/components/ui/button";

import { useActionState, useEffect, useRef, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { savePeriodCostLine } from "@/app/(business)/period-costs/actions";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import {
  formatMoneyInput,
  parseMoneyInput,
} from "@/lib/schemas/supplies/input-format";
import {
  periodCostLineSchema,
  type PeriodCostLineFormValues,
} from "@/lib/schemas/costs/period-costs";
import {
  formatPeriodLabel,
  type PeriodCostLineView,
} from "./period-costs-values";

const SERVER_FIELDS = ["concept", "amountPeriod"] as const;

type PeriodCostsFormProps = {
  // The month the screen is showing. It travels with the payload so a line
  // created from this screen belongs to that month.
  period: string;
  line: PeriodCostLineView | null;
  onCancel: () => void;
  onSaved: (line: PeriodCostLineView) => void;
};

// The single create/edit form of the catalog modal (#285). Same contract and
// same visual language as the Insumos and Productos forms; the only fields are
// the concept and the amount of the month.
export function PeriodCostsForm({
  period,
  line,
  onCancel,
  onSaved,
}: PeriodCostsFormProps) {
  const isEditing = line !== null;
  const [state, submitAction, isPending] = useActionState(
    savePeriodCostLine,
    undefined,
  );

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<PeriodCostLineFormValues>({
    resolver: zodResolver(periodCostLineSchema),
    defaultValues: {
      concept: line?.concept ?? "",
      // The input shows the AR format; the schema converts it to the canonical
      // decimal string on submit.
      amountPeriod: formatMoneyInput(line?.amountPeriod ?? ""),
    },
  });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);

  // Closing the modal on save must happen once, even if the parent re-renders
  // while the action result is still the current state.
  const notified = useRef(false);
  useEffect(() => {
    if (!state?.ok || notified.current) return;
    notified.current = true;
    onSaved(state.data);
  }, [state, onSaved]);

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit((data) => {
      dispatchInTransition(submitAction)({
        ...(isEditing ? { id: line.id } : {}),
        period,
        concept: data.concept,
        amountPeriod: data.amountPeriod,
      });
    })(event);
  };

  const conceptField = register("concept");
  const amountField = register("amountPeriod");

  return (
    <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-3">
      {state && !state.ok && !hasServerFieldErrors && (
        <p role="alert" className="rounded-[16px] bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}

      <TextField
        label="Concepto"
        placeholder="Alquiler, luz, internet…"
        autoComplete="off"
        disabled={isPending}
        error={errors.concept?.message}
        {...conceptField}
      />

      <TextField
        label="Importe del mes"
        placeholder="20.000,00"
        inputMode="decimal"
        autoComplete="off"
        disabled={isPending}
        error={errors.amountPeriod?.message}
        {...amountField}
        onBlur={(event) => {
          amountField.onBlur(event);
          // Show the amount in Argentine format once the user leaves the field,
          // as the supply catalog's money input does. An unreadable value is
          // kept as typed so the schema can explain what is wrong with it.
          const canonical = parseMoneyInput(event.currentTarget.value);
          if (canonical === "") return;

          const formatted = formatMoneyInput(canonical);
          if (formatted !== event.currentTarget.value) {
            event.currentTarget.value = formatted;
            setValue("amountPeriod", formatted, { shouldValidate: true });
          }
        }}
      />

      <p className="text-xs text-fg-muted">
        Este gasto se guarda una sola vez para todo el catálogo y se suma al total
        de {formatPeriodLabel(period)}.
      </p>

      <div className="flex gap-3">
        <PrimaryButton type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar"}
        </PrimaryButton>
        <Button variant="ghost" size="md"
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="min-h-11! flex-1! rounded-[14px]! border! border-border-control! bg-surface! px-4! py-2! text-base! font-semibold! text-fg! hover:bg-surface-tint! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:cursor-not-allowed! disabled:opacity-50!"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
