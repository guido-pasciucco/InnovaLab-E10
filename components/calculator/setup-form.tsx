"use client";

import { useActionState, useEffect, useRef } from "react";
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
    reset,
    formState: { errors, isDirty },
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

  const isSubmittingRef = useRef(false);
  const lastProcessedStateRef = useRef<typeof state | null>(null);

  // Libera el bloqueo de doble envío cuando la acción termina (éxito o fallo).
  useEffect(() => {
    if (!isPending && isSubmittingRef.current) {
      isSubmittingRef.current = false;
    }
  }, [isPending]);

  // Sincroniza el formulario con los datos confirmados por el servidor
  // después de un guardado exitoso, sin sobrescribir ediciones pendientes.
  useEffect(() => {
    if (!hasSuccess || !state.data || isDirty) return;
    if (lastProcessedStateRef.current === state) return;
    lastProcessedStateRef.current = state;
    reset(state.data);
  }, [hasSuccess, state, reset, isDirty]);

  const handleSubmitAction = (data: CalculatorSetup) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    dispatchInTransition(submitAction)(data);
  };

  return (
    <form
      onSubmit={handleSubmit(handleSubmitAction)}
      noValidate
      className="mt-6 flex flex-col gap-4"
    >
      {hasSuccess && !isDirty && (
        <div role="status" className="text-sm text-green-600">
          <p>Guardado</p>
          <p>{buildConfirmation(state.data)}</p>
        </div>
      )}
      {state && !state.ok && !hasServerFieldErrors && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          Nombre del producto
        </label>
        <input
          id="name"
          disabled={isPending}
          {...register("name")}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
        {errors.name && (
          <p role="alert" className="text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="unit" className="text-sm font-medium text-gray-700">
          Unidad
        </label>
        <input
          id="unit"
          disabled={isPending}
          {...register("unit")}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
        {errors.unit && (
          <p role="alert" className="text-sm text-red-600">
            {errors.unit.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="volume" className="text-sm font-medium text-gray-700">
          Volumen
        </label>
        <input
          id="volume"
          type="number"
          disabled={isPending}
          {...register("volume", { valueAsNumber: true })}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
        {errors.volume && (
          <p role="alert" className="text-sm text-red-600">
            {errors.volume.message}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">El volumen divide los costos fijos.</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Moneda</span>
        <span className="text-sm text-gray-900">ARS</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Período</span>
        <span className="text-sm text-gray-900">Mensual</span>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isPending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
