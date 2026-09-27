"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSchema } from "@/lib/schemas/auth/auth";
import { login } from "./actions";
import { type LoginState } from "@/lib/types/auth";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import type { Path } from "react-hook-form";

const initialState: LoginState = undefined;

// Los tipos salen del schema compartido (fuente única): si cambia
// el schema, el form se entera solo.
type LoginFormValues = z.infer<typeof loginSchema>;

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<LoginFormValues>[] = ["email", "password"];

export default function LoginForm() {
  const router = useRouter();
  const [state, submitAction, pending] = useActionState(login, initialState);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);

  useEffect(() => {
    if (state?.ok) {
      router.push("/");
      router.refresh();
    }
  }, [state, router]);

  return (
    // RHF valida en el cliente con el mismo schema; solo si pasa,
    // despacha a la action (envuelta en transición por el helper).
    <form onSubmit={handleSubmit(dispatchInTransition(submitAction))} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Correo electrónico
        </label>
        <input
          {...register("email")}
          id="email"
          type="email"
          autoComplete="email"
          disabled={pending}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
        {errors.email && (
          <p role="alert" className="text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <input
          {...register("password")}
          id="password"
          type="password"
          autoComplete="current-password"
          disabled={pending}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
        {errors.password && (
          <p role="alert" className="text-sm text-red-600">
            {errors.password.message}
          </p>
        )}
      </div>

      {state && !state.ok && !hasServerFieldErrors && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      {state?.ok && (
        <p role="status" className="text-sm text-green-600">
          Sesión iniciada correctamente. Redirigiendo…
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
