"use client";

import { useEffect, useRef, useState, type ComponentPropsWithRef } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signupFormSchema } from "@/lib/schemas/auth/auth";
import { signup } from "./actions";
import { type SignupState } from "@/lib/types/auth";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import type { Path } from "react-hook-form";

const initialState: SignupState = undefined;

// Types come from the screen's contract (single source): signupSchema plus
// the frontend-only password confirmation. If a field rule changes, the
// form follows on its own.
type SignupFormValues = z.infer<typeof signupFormSchema>;

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<SignupFormValues>[] = ["displayName", "email", "password"];

// Password field with a show/hide control. Reused for the password and its
// confirmation. The `register` props ride in through `props`.
type PasswordInputProps = ComponentPropsWithRef<"input"> & {
  label: string;
  error?: string;
  hint?: string;
};

function PasswordInput({ label, error, hint, id, autoComplete, disabled, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : undefined, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`min-h-14 w-full rounded-[10px] border bg-white py-3 pl-4 pr-24 text-lg text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green-600,var(--color-blue-600))] aria-invalid:border-red-600 aria-invalid:focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:bg-gray-100 ${
            error ? "border-red-600" : "border-gray-400"
          }`}
        />
        <button
          type="button"
          onClick={() => setShow((visible) => !visible)}
          aria-pressed={show}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex w-24 items-center justify-center rounded-[10px] text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          {show ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// Accessible confirmation shown after a successful signup. It does NOT
// claim the email is verified: verification happens when the person
// confirms the email link (a different flow). Staying on the page lets
// everyone read the next step at their own pace; the link to /login is
// the explicit way to continue.
function SignupSuccessDialog() {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-success-title"
        aria-describedby="signup-success-body"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md focus-visible:outline-2 focus-visible:outline-[var(--brand-green-600,var(--color-blue-600))]"
      >
        <h2 id="signup-success-title" className="text-2xl font-bold text-gray-900">
          ¡Cuenta creada!
        </h2>
        <p id="signup-success-body" className="mt-3 text-sm text-gray-700">
          Te enviamos un correo para que <strong>verifiques tu cuenta</strong>. Revisá tu
          bandeja de entrada (por si está en el spam) y tocá el enlace de verificación.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Tu correo todavía no quedó verificado: se confirma cuando seguís ese enlace.
        </p>
        <LinkToLogin />
      </div>
    </div>
  );
}

// Shared by the dialog and the card bottom: the explicit way to continue.
function LinkToLogin() {
  return (
    <Link
      href="/login"
      className="mt-6 flex min-h-[54px] items-center justify-center rounded-[14px] bg-[var(--brand-green-600,var(--color-blue-600))] px-4 py-3 text-lg font-semibold text-white hover:bg-[var(--brand-green-700,var(--color-blue-700))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green-600,var(--color-blue-600))]"
    >
      Ir a iniciar sesión
    </Link>
  );
}

export default function SignupForm() {
  const [state, submitAction, pending] = useActionState(signup, initialState);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
  });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);

  return (
    // RHF validates in the client with the screen's contract (including the
    // password confirmation); only then it dispatches to the action (wrapped
    // in a transition by the helper). The confirmation is stripped here so
    // the server keeps receiving exactly the signupSchema payload.
    <form
      onSubmit={handleSubmit(({ displayName, email, password }) =>
        dispatchInTransition(submitAction)({ displayName, email, password }),
      )}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium text-gray-700">
          Nombre y apellido
        </label>
        <input
          {...register("displayName")}
          id="displayName"
          type="text"
          autoComplete="name"
          placeholder="Tu nombre y apellido"
          disabled={pending}
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby={errors.displayName ? "displayName-error" : undefined}
          className={`min-h-14 w-full rounded-[10px] border bg-white py-3 px-4 text-lg text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green-600,var(--color-blue-600))] aria-invalid:border-red-600 aria-invalid:focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:bg-gray-100 ${
            errors.displayName ? "border-red-600" : "border-gray-400"
          }`}
        />
        {errors.displayName && (
          <p id="displayName-error" role="alert" className="text-sm text-red-600">
            {errors.displayName.message}
          </p>
        )}
      </div>

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
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={`min-h-14 w-full rounded-[10px] border bg-white py-3 px-4 text-lg text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green-600,var(--color-blue-600))] aria-invalid:border-red-600 aria-invalid:focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:bg-gray-100 ${
            errors.email ? "border-red-600" : "border-gray-400"
          }`}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <PasswordInput
        {...register("password")}
        id="password"
        label="Contraseña"
        autoComplete="new-password"
        hint="Mínimo 8 caracteres."
        error={errors.password?.message}
        disabled={pending}
      />

      <PasswordInput
        {...register("confirmPassword")}
        id="confirmPassword"
        label="Confirmar contraseña"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        disabled={pending}
      />

      {/* Informative only: the legal text does not exist yet, so there is
          nothing to accept (see issue #183). No checkbox on purpose. */}
      <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        <span className="font-medium text-gray-900">Términos y Condiciones:</span>{" "}
        Documentación pendiente. No se exigen todavía.
      </p>

      {state && !state.ok && !hasServerFieldErrors && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || Boolean(state?.ok)}
        className="min-h-[54px] w-full rounded-[14px] bg-[var(--brand-green-600,var(--color-blue-600))] px-4 py-3 text-lg font-semibold text-white hover:bg-[var(--brand-green-700,var(--color-blue-700))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green-600,var(--color-blue-600))] disabled:cursor-not-allowed disabled:bg-[var(--brand-green-100,var(--color-blue-300))]"
      >
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>

      {state?.ok && <SignupSuccessDialog />}
    </form>
  );
}
