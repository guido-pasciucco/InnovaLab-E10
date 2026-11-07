"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import type { Path } from "react-hook-form";

import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";

import {
  demoAction,
  type DemoActionState,
  type DemoFormValues,
} from "../actions";

// DEMO ONLY — remove this file with the /demo-errores section.
// Fields the server may flag; module-level so the reference stays stable
// (the hook uses it as an effect dependency).
const SERVER_FIELDS: readonly Path<DemoFormValues>[] = ["email"];

const initialState: DemoActionState = undefined;

export function ActionDemoForm() {
  const [state, submitAction, pending] = useActionState(demoAction, initialState);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DemoFormValues>({
    defaultValues: { email: "", mode: "ok" },
  });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);

  return (
    <form
      onSubmit={handleSubmit(dispatchInTransition(submitAction))}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="demo-email" className="text-sm font-medium text-gray-700">
          Correo electrónico
        </label>
        <input
          {...register("email")}
          id="demo-email"
          type="email"
          autoComplete="off"
          disabled={pending}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "demo-email-error" : undefined}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
        {errors.email && (
          <p id="demo-email-error" role="alert" className="text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="demo-mode" className="text-sm font-medium text-gray-700">
          Resultado del servidor
        </label>
        <select
          {...register("mode")}
          id="demo-mode"
          disabled={pending}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        >
          <option value="ok">Datos válidos</option>
          <option value="domain">Falla de dominio (CALC_UNAVAILABLE)</option>
        </select>
      </div>

      {state && !state.ok && !hasServerFieldErrors && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.message}
        </p>
      )}

      {state?.ok && (
        <p
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
        >
          Guardado: {state.data.email}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
