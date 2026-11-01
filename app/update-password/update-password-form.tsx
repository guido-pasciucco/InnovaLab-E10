"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ComponentPropsWithRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { previewFieldMessage } from "@/components/forms/preview-errors";
import { updatePassword } from "./actions";
import { type PasswordUpdateState } from "@/lib/types/auth";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import {
  ErrorPreviewControl,
  SHOW_ERROR_PREVIEW,
  type PreviewScenario,
} from "@/components/forms/error-preview";
import {
  updatePasswordFormSchema,
  type UpdatePasswordFormValues,
} from "./update-password-schema";
import type { Path } from "react-hook-form";

const initialState: PasswordUpdateState = undefined;

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<UpdatePasswordFormValues>[] = ["password"];

// Dev-only scenarios. Field messages are parsed through the real schema and
// server states reuse the real allowlisted codes, so nothing is invented.
const PREVIEW_SCENARIOS: readonly PreviewScenario[] = [
  { id: "password-short", label: "Contraseña corta" },
  { id: "confirm-mismatch", label: "Confirmación distinta" },
  { id: "session-missing", label: "Sesión vencida" },
  { id: "generic-error", label: "Error general" },
];

type PasswordInputProps = ComponentPropsWithRef<"input"> & {
  label: string;
  error?: string;
  hint?: string;
};

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9.4 5.1 9.9 7.8a12.3 12.3 0 0 1-3.1 4.9M6.6 6.6C4.6 8.2 2.5 10.6 2.1 11.8 2.6 14.5 6.5 19.6 12 19.6c.8 0 1.6-.1 2.3-.3" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
      <path d="M2.1 12S5.7 5.5 12 5.5 21.9 12 21.9 12 18.3 18.5 12 18.5 2.1 12 2.1 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

function PasswordInput({ label, error, hint, id, autoComplete, disabled, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-[#31503a] lg:text-sm">
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
          className={`h-10 w-full rounded-md border bg-white px-3 pr-10 text-sm text-[#17351f] outline-none transition focus-visible:ring-2 focus-visible:ring-[#3ad85c] disabled:cursor-not-allowed disabled:bg-slate-100 lg:h-[42px] lg:text-base ${error ? "border-red-500" : "border-[#b7c9bb]"}`}
        />
        <button
          type="button"
          onClick={() => setShow((visible) => !visible)}
          aria-pressed={show}
          aria-controls={id}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-[#6a806f] hover:text-[#174425] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#3ad85c]"
        >
          <EyeIcon visible={show} />
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-[10px] text-[#6a806f] lg:text-[13px]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 lg:text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

// Server failures stay in Spanish without touching the backend contract:
// the action keeps returning its ErrorCode and this screen only presents it.
function serverErrorMessage(code: string): string {
  switch (code) {
    case "AUTH_SESSION_MISSING":
      return "Tu sesión venció. Pedí un enlace nuevo para continuar.";
    case "AUTH_PASSWORD_UPDATE_FAILED":
      return "No pudimos actualizar la contraseña. Probá con otra que cumpla los requisitos.";
    case "AUTH_RATE_LIMITED":
      return "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.";
    case "VALIDATION":
      return "Revisá la contraseña ingresada.";
    default:
      return "No pudimos actualizar la contraseña. Intentá de nuevo en unos minutos.";
  }
}

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [state, submitAction, pending] = useActionState(updatePassword, initialState);
  const [previewScenario, setPreviewScenario] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordFormSchema),
  });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);
  const realErrorMessage =
    state && !state.ok && !hasServerFieldErrors ? serverErrorMessage(state.code) : null;
  const realSessionExpired = Boolean(state && !state.ok && state.code === "AUTH_SESSION_MISSING");

  // Dev-only preview: same slots, same accessible markup, same real texts.
  // While a scenario is active the submit is blocked, so no password change
  // or network request can happen from the demo.
  const previewPasswordError =
    previewScenario === "password-short"
      ? previewFieldMessage(
          updatePasswordFormSchema,
          { password: "corta", confirm: "corta" },
          "password",
        )
      : null;
  const previewConfirmError =
    previewScenario === "confirm-mismatch"
      ? previewFieldMessage(
          updatePasswordFormSchema,
          { password: "unaClaveSegura123", confirm: "otraClaveSegura123" },
          "confirm",
        )
      : null;
  // AUTH_UNAVAILABLE is a real service code and this screen renders it with
  // its generic fallback, which is exactly the "general error" state.
  const previewStateCode =
    previewScenario === "session-missing"
      ? "AUTH_SESSION_MISSING"
      : previewScenario === "generic-error"
        ? "AUTH_UNAVAILABLE"
        : null;
  const previewErrorMessage = previewStateCode ? serverErrorMessage(previewStateCode) : null;

  const passwordError = previewPasswordError ?? errors.password?.message;
  const confirmError = previewConfirmError ?? errors.confirm?.message;
  const errorMessage = previewErrorMessage ?? realErrorMessage;
  const sessionExpired = previewStateCode === "AUTH_SESSION_MISSING" || realSessionExpired;
  const previewActive = previewScenario !== null;

  useEffect(() => {
    if (state?.ok) {
      router.push("/login");
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      {/* RHF validates in the client (schema + confirm match); only then it
          dispatches the password alone to the action (transition-wrapped). */}
      <form
        noValidate
        aria-busy={pending}
        onSubmit={handleSubmit((values) => {
          // A preview scenario must never change a real password.
          if (previewActive) return;
          dispatchInTransition(submitAction)({ password: values.password });
        })}
        className="flex flex-col gap-3"
      >
        <PasswordInput
          {...register("password")}
          id="password"
          label="Nueva contraseña"
          autoComplete="new-password"
          hint="Mínimo 8 caracteres."
          error={passwordError}
          disabled={pending}
        />
        <PasswordInput
          {...register("confirm")}
          id="confirm"
          label="Confirmar contraseña"
          autoComplete="new-password"
          error={confirmError}
          disabled={pending}
        />

        {errorMessage && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700 lg:text-sm"
          >
            {errorMessage}
            {sessionExpired && (
              <>
                {" "}
                <Link
                  href="/reset-password"
                  className="font-semibold text-red-800 underline underline-offset-2"
                >
                  Solicitar un enlace nuevo
                </Link>
              </>
            )}
          </p>
        )}

        {state?.ok && (
          <p
            role="status"
            className="rounded-md border border-[#c8ecd2] bg-[#f1fdf4] px-3 py-2 text-xs leading-relaxed text-[#1d6b35] lg:text-sm"
          >
            Contraseña actualizada. Te estamos llevando al inicio de sesión…
          </p>
        )}

        <button
          type="submit"
          disabled={pending || Boolean(state?.ok) || previewActive}
          className="mt-1 h-10 w-full rounded-md bg-[#31df4f] px-4 text-sm font-bold text-[#103b1c] shadow-[0_4px_10px_rgba(37,213,73,0.35)] transition hover:bg-[#24ca42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168a3d] disabled:cursor-not-allowed disabled:bg-[#b5eebe] lg:h-[44px] lg:text-base"
        >
          {pending ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>

      {SHOW_ERROR_PREVIEW && (
        <ErrorPreviewControl
          scenarios={PREVIEW_SCENARIOS}
          selected={previewScenario}
          onSelect={setPreviewScenario}
        />
      )}
    </>
  );
}
