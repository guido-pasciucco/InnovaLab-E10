"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { passwordResetRequestSchema } from "@/lib/schemas/auth/auth";
import { requestPasswordReset } from "./actions";
import { type PasswordResetState } from "@/lib/types/auth";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import {
  ErrorPreviewControl,
  SHOW_ERROR_PREVIEW,
  type PreviewScenario,
} from "@/components/forms/error-preview";
import { previewFieldMessage } from "@/components/forms/preview-errors";
import { linkErrorMessageEs } from "./link-error-messages";
import type { Path } from "react-hook-form";

const initialState: PasswordResetState = undefined;

// Types come from the shared schema (single source). The redirect origin
// for the email link is resolved on the server, never sent from here.
type ResetFormValues = z.infer<typeof passwordResetRequestSchema>;

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<ResetFormValues>[] = ["email"];

// Dev-only scenarios. Each sample is parsed through the real schema (or the
// real allowlisted link code), so the preview can never invent a message.
const PREVIEW_SCENARIOS: readonly PreviewScenario[] = [
  { id: "email-empty", label: "Correo vacío" },
  { id: "email-invalid", label: "Correo inválido" },
  { id: "link-invalid", label: "Enlace inválido o vencido" },
];

// The service answers success even when the account does not exist, so the
// screen must never turn a server failure into a false confirmation.
function serverErrorMessage(code: string): string {
  if (code === "AUTH_RATE_LIMITED") {
    return "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.";
  }
  if (code === "VALIDATION") {
    return "Revisá el correo ingresado.";
  }
  return "No pudimos enviar el correo. Intentá de nuevo en unos minutos.";
}

type ResetPasswordFormProps = {
  // Page-level error from /auth/confirm (?error=<code>), already allowlisted
  // by link-error.ts. It is rendered here so a successful request can
  // dismiss it instead of showing it next to the neutral confirmation.
  linkError?: string | null;
};

// The success panel replaces the form. Asking for another link has to bring
// the form back with a clean state: remounting the body resets useActionState
// without a full reload, and the action/service stay untouched.
export default function ResetPasswordForm({ linkError = null }: ResetPasswordFormProps) {
  const [formKey, setFormKey] = useState(0);
  const [linkErrorDismissed, setLinkErrorDismissed] = useState(false);

  const requestAnotherLink = useCallback(() => setFormKey((key) => key + 1), []);
  const dismissLinkError = useCallback(() => setLinkErrorDismissed(true), []);

  return (
    <ResetPasswordFormBody
      key={formKey}
      linkError={linkErrorDismissed ? null : linkError}
      autoFocusEmail={formKey > 0}
      onRequestAnother={requestAnotherLink}
      onSuccess={dismissLinkError}
    />
  );
}

type ResetPasswordFormBodyProps = {
  linkError: string | null;
  autoFocusEmail: boolean;
  onRequestAnother: () => void;
  onSuccess: () => void;
};

function ResetPasswordFormBody({
  linkError,
  autoFocusEmail,
  onRequestAnother,
  onSuccess,
}: ResetPasswordFormBodyProps) {
  const [state, submitAction, pending] = useActionState(requestPasswordReset, initialState);
  const [previewScenario, setPreviewScenario] = useState<string | null>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(passwordResetRequestSchema),
  });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);
  const errorMessage =
    state && !state.ok && !hasServerFieldErrors ? serverErrorMessage(state.code) : null;
  const succeeded = Boolean(state?.ok);

  // Dev-only preview: the messages come from the real schema / allowlist and
  // render through the same slots as real errors. The submit stays disabled
  // while a scenario is active, so the preview never sends a reset email.
  const previewEmailError =
    previewScenario === "email-empty"
      ? previewFieldMessage(passwordResetRequestSchema, { email: "" }, "email")
      : previewScenario === "email-invalid"
        ? previewFieldMessage(passwordResetRequestSchema, { email: "no-es-un-correo" }, "email")
        : null;
  const previewLinkError =
    previewScenario === "link-invalid" ? linkErrorMessageEs("AUTH_LINK_INVALID") : null;
  const emailError = previewEmailError ?? errors.email?.message;
  const effectiveLinkError = previewLinkError ?? linkError;
  const previewActive = previewScenario !== null;

  // Move focus to the confirmation: the submit button that had focus is
  // unmounted, and the panel must be announced without leaving focus on body.
  useEffect(() => {
    if (succeeded) successHeadingRef.current?.focus();
  }, [succeeded]);

  // A stale link error must not survive a successful request.
  useEffect(() => {
    if (succeeded) onSuccess();
  }, [succeeded, onSuccess]);

  // After "Solicitar otro enlace" the form is remounted; put the caret back
  // where the user has to type instead of leaving focus on <body>.
  useEffect(() => {
    if (autoFocusEmail) setFocus("email");
  }, [autoFocusEmail, setFocus]);

  // Neutral confirmation: the same message is shown whether or not the
  // account exists (anti-enumeration). The form is replaced so a second
  // submit cannot look like a new, unrelated success.
  if (succeeded) {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-xl border border-[#d7e5d9] bg-[#f8fcf8] p-4"
      >
        <h3
          ref={successHeadingRef}
          tabIndex={-1}
          className="text-base font-bold text-[#12321e] outline-none"
        >
          Revisá tu correo
        </h3>
        <p className="text-xs leading-relaxed text-[#496352] lg:text-sm">
          Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña.
        </p>
        <p className="text-xs leading-relaxed text-[#607565]">
          Revisá también la carpeta de spam. Por seguridad, el enlace vence.
        </p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/login"
            className="flex h-10 flex-1 items-center justify-center rounded-md bg-[#31df4f] px-4 text-sm font-bold text-[#103b1c] shadow-[0_4px_10px_rgba(37,213,73,0.35)] transition hover:bg-[#24ca42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168a3d]"
          >
            Ir a iniciar sesión
          </Link>
          <button
            type="button"
            onClick={onRequestAnother}
            className="flex h-10 flex-1 items-center justify-center rounded-md border border-[#b7c9bb] bg-white px-4 text-sm font-semibold text-[#174425] transition hover:border-[#3ad85c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168a3d]"
          >
            Solicitar otro enlace
          </button>
        </div>
      </div>
    );
  }

  // The link error belongs to the email field, so it is announced as its
  // description instead of floating as an unrelated alert.
  const emailDescribedBy = [
    effectiveLinkError ? "link-error" : undefined,
    emailError ? "email-error" : "email-hint",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {effectiveLinkError && (
        <p
          id="link-error"
          role="alert"
          className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700 lg:text-sm"
        >
          {effectiveLinkError}
        </p>
      )}

      {/* RHF validates in the client with the same schema; only then it
          dispatches to the action (wrapped in a transition by the helper). */}
      <form
        noValidate
        aria-busy={pending}
        onSubmit={handleSubmit((values) => {
          // A preview scenario must never turn into a real recovery email.
          if (previewActive) return;
          dispatchInTransition(submitAction)(values);
        })}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs font-medium text-[#31503a] lg:text-sm">
            Correo electrónico
          </label>
          <input
            {...register("email")}
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nombre@correo.com"
            disabled={pending}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailDescribedBy}
            className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-[#17351f] outline-none transition placeholder:text-[#9ba9a0] focus-visible:ring-2 focus-visible:ring-[#3ad85c] disabled:cursor-not-allowed disabled:bg-slate-100 lg:h-[42px] lg:text-base ${emailError ? "border-red-500" : "border-[#b7c9bb]"}`}
          />
          {emailError ? (
            <p id="email-error" role="alert" className="text-xs text-red-600 lg:text-sm">
              {emailError}
            </p>
          ) : (
            <p id="email-hint" className="text-[10px] text-[#6a806f] lg:text-[13px]">
              Usá el correo con el que te registraste.
            </p>
          )}
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700 lg:text-sm"
          >
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || previewActive}
          className="mt-1 h-10 w-full rounded-md bg-[#31df4f] px-4 text-sm font-bold text-[#103b1c] shadow-[0_4px_10px_rgba(37,213,73,0.35)] transition hover:bg-[#24ca42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168a3d] disabled:cursor-not-allowed disabled:bg-[#b5eebe] lg:h-[44px] lg:text-base"
        >
          {pending ? "Enviando enlace…" : "Enviar enlace"}
        </button>

        <p className="text-center text-xs text-[#607565] lg:text-sm">
          ¿No tenés cuenta?{" "}
          <Link href="/signup" className="font-semibold text-[#168a3d] underline-offset-2 hover:underline">
            Crear cuenta
          </Link>
        </p>
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
