"use client";

import { Button } from "@/components/ui/button";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authErrorMessage } from "@/components/auth/auth-error-messages";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import {
  ErrorPreviewControl,
  SHOW_ERROR_PREVIEW,
  type PreviewScenario,
} from "@/components/forms/error-preview";
import { PasswordInput } from "@/components/forms/password-input";
import { previewFieldMessage } from "@/components/forms/preview-errors";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { useTransportAwareAction } from "@/components/forms/use-transport-aware-action";
import { type PasswordUpdateState } from "@/lib/types/auth";

import { updatePassword } from "./actions";
import { updatePasswordFormSchema, type UpdatePasswordFormValues } from "./update-password-schema";

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

// Server failures stay in Spanish without touching the backend contract:
// the action keeps returning its ErrorCode and this screen only presents it.
function updateErrorMessage(code: string): string {
  return authErrorMessage(code) ?? "No pudimos actualizar la contraseña. Intentá de nuevo en unos minutos.";
}

export default function UpdatePasswordForm() {
  const router = useRouter();
  const { action, transportError, clearTransportError } = useTransportAwareAction(updatePassword);
  const [state, submitAction, pending] = useActionState(action, initialState);
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
  // A transport failure wins over the server message: the request never
  // arrived, so the previous state is not meaningful anymore.
  const realErrorMessage =
    transportError ??
    (state && !state.ok && !hasServerFieldErrors ? updateErrorMessage(state.code) : null);
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
  const previewErrorMessage = previewStateCode ? updateErrorMessage(previewStateCode) : null;

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
        onChange={clearTransportError}
        onSubmit={(event) => {
          clearTransportError();
          return handleSubmit((values) => {
            // A preview scenario must never change a real password.
            if (previewActive) return;
            dispatchInTransition(submitAction)({ password: values.password });
          })(event);
        }}
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
            className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs leading-relaxed text-danger lg:text-sm"
          >
            {errorMessage}
            {sessionExpired && (
              <>
                {" "}
                <Link href="/reset-password" className="font-semibold underline underline-offset-2">
                  Solicitar un enlace nuevo
                </Link>
              </>
            )}
          </p>
        )}

        {state?.ok && (
          <p
            role="status"
            className="rounded-md border border-success/30 bg-success-subtle px-3 py-2 text-xs leading-relaxed text-success lg:text-sm"
          >
            Contraseña actualizada. Te estamos llevando al inicio de sesión…
          </p>
        )}

        <Button variant="primary" size="md"
          type="submit"
          disabled={pending || Boolean(state?.ok) || previewActive}
          className="mt-1! min-h-10! h-10! w-full! rounded-md! bg-action-primary! px-4! text-sm! font-bold! text-on-action-primary! shadow-[0_4px_10px_rgba(10,122,18,0.3)]! transition! hover:bg-action-primary-hover! active:bg-action-primary-pressed! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:cursor-not-allowed! disabled:bg-action-disabled! disabled:text-fg-disabled! lg:h-[44px]! lg:text-base!"
        >
          {pending ? "Guardando…" : "Guardar contraseña"}
        </Button>
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
