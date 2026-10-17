"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Path } from "react-hook-form";

import { saveCalculatorSetup } from "@/app/(calculator)/paso-1/actions";
import {
  calculatorSetupSchema,
  type CalculatorSetup,
} from "@/lib/schemas/calculator-setup/calculator-setup";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { buildConfirmation } from "@/components/calculator/build-confirmation";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";

type SetupFormProps = {
  defaultValues: CalculatorSetup;
};

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<CalculatorSetup>[] = ["name", "unit", "volume"];

export function SetupForm({ defaultValues }: SetupFormProps) {
  const [state, submitAction, isPending] = useActionState(
    saveCalculatorSetup,
    undefined,
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CalculatorSetup>({
    resolver: zodResolver(calculatorSetupSchema),
    defaultValues,
  });

  const hasServerFieldErrors = useServerFieldErrors(
    state,
    setError,
    SERVER_FIELDS,
  );

  const hasSuccess = state?.ok && state.data;

  return (
    <form onSubmit={handleSubmit(dispatchInTransition(submitAction))}>
      {hasSuccess && (
        <div role="status">
          <p>Guardado</p>
          <p>{buildConfirmation(state.data)}</p>
        </div>
      )}
      {state && !state.ok && !hasServerFieldErrors && (
        <p role="alert">{state.message}</p>
      )}

      <div>
        <label htmlFor="name">Nombre del producto</label>
        <input id="name" disabled={isPending} {...register("name")} />
        {errors.name && (
          <p role="alert">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="unit">Unidad</label>
        <input id="unit" disabled={isPending} {...register("unit")} />
        {errors.unit && (
          <p role="alert">{errors.unit.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="volume">Volumen</label>
        <input
          id="volume"
          type="number"
          disabled={isPending}
          {...register("volume", { valueAsNumber: true })}
        />
        {errors.volume && (
          <p role="alert">{errors.volume.message}</p>
        )}
        <p>El volumen divide los costos fijos.</p>
      </div>
      <div>
        <span>Moneda</span>
        <span>ARS</span>
      </div>

      <div>
        <span>Período</span>
        <span>Mensual</span>
      </div>
      <button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
