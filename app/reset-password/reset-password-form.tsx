"use client";

import { Button } from "@/components/ui/button";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { authErrorMessage } from "@/components/auth/auth-error-messages";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import {
  ErrorPreviewControl,
  SHOW_ERROR_PREVIEW,
  type PreviewScenario,
} from "@/components/forms/error-preview";
import { previewFieldMessage } from "@/components/forms/preview-errors";
import { TextField } from "@/components/forms/text-field";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { useTransportAwareAction } from "@/components/forms/use-transport-aware-action";
import { passwordResetRequestSchema } from "@/lib/schemas/auth/auth";
import { type PasswordResetState } from "@/lib/types/auth";

import { requestPasswordReset } from "./actions";

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
function resetErrorMessage(code: string): string {
  return authErrorMessage(code) ?? "No pudimos enviar el correo. Intentá de nuevo en unos minutos.";
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
  const [dismissedLinkError, setDismissedLinkError] = useState<string | null>(null);

  const requestAnotherLink = useCallback(() => setFormKey((key) => key + 1), []);
  const dismissLinkError = useCallback(() => setDismissedLinkError(linkError), [linkError]);

  // A new link error (for example, a second expired link) must be shown
  // again even if a previous one was dismissed after a successful request.
  const effectiveLinkError = linkError === dismissedLinkError ? null : linkError;

  return (
    <ResetPasswordFormBody
      key={formKey}
      linkError={effectiveLinkError}
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
  const { action, transportError, clearTransportError } = useTransportAwareAction(requestPasswordReset);
  const [state, submitAction, pending] = useActionState(action, initialState);
  const [previewScenario, setPreviewScenario] = useState<string | null>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const successHandledRef = useRef(false);
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
  // A transport failure wins over the server message: the request never
  // arrived, so the previous state is not meaningful anymore.
  const errorMessage =
    transportError ??
    (state && !state.ok && !hasServerFieldErrors ? resetErrorMessage(state.code) : null);
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
    previewScenario === "link-invalid" ? authErrorMessage("AUTH_LINK_INVALID") : null;
  const emailError = previewEmailError ?? errors.email?.message;
  const effectiveLinkError = previewLinkError ?? linkError;
  const previewActive = previewScenario !== null;

  // Move focus to the confirmation: the submit button that had focus is
  // unmounted, and the panel must be announced without leaving focus on body.
  useEffect(() => {
    if (succeeded) successHeadingRef.current?.focus();
  }, [succeeded]);

  // A stale link error must not survive a successful request. The ref keeps
  // this to the false→true transition: navigating to a new link error must
  // not dismiss it just because the previous request had succeeded.
  useEffect(() => {
    if (!succeeded) {
      successHandledRef.current = false;
      return;
    }
    if (successHandledRef.current) return;
    successHandledRef.current = true;
    onSuccess();
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
        className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-tint p-4"
      >
        <h3 ref={successHeadingRef} tabIndex={-1} className="text-base font-bold text-fg outline-none">
          Revisá tu correo
        </h3>
        <p className="text-xs leading-relaxed text-fg-muted lg:text-sm">
          Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña.
        </p>
        <p className="text-xs leading-relaxed text-fg-muted">
          Revisá también la carpeta de spam. Por seguridad, el enlace vence.
        </p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/login"
            className="flex h-10 flex-1 items-center justify-center rounded-md bg-action-primary px-4 text-sm font-bold text-on-action-primary shadow-[0_4px_10px_rgba(10,122,18,0.3)] transition hover:bg-action-primary-hover active:bg-action-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Ir a iniciar sesión
          </Link>
          <Button variant="outline" size="md"
            type="button"
            onClick={onRequestAnother}
            className="flex! min-h-10! h-10! flex-1! items-center! justify-center! rounded-md! border! border-border-default! bg-action-tonal! px-4! text-sm! font-semibold! text-on-action-tonal! transition! hover:border-accent-glow! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus!"
          >
            Solicitar otro enlace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {effectiveLinkError && (
        <p
          id="link-error"
          role="alert"
          className="mb-3 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs leading-relaxed text-danger lg:text-sm"
        >
          {effectiveLinkError}
        </p>
      )}

      {/* RHF validates in the client with the same schema; only then it
          dispatches to the action (wrapped in a transition by the helper). */}
      <form
        noValidate
        aria-busy={pending}
        onChange={clearTransportError}
        onSubmit={(event) => {
          clearTransportError();
          return handleSubmit((values) => {
            // A preview scenario must never turn into a real recovery email.
            if (previewActive) return;
            dispatchInTransition(submitAction)(values);
          })(event);
        }}
        className="flex flex-col gap-3"
      >
        <TextField
          {...register("email")}
          id="email"
          type="email"
          label="Correo electrónico"
          autoComplete="email"
          inputMode="email"
          placeholder="nombre@correo.com"
          hint="Usá el correo con el que te registraste."
          error={emailError}
          disabled={pending}
        />

        {errorMessage && (
          <p
            role="alert"
            className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs leading-relaxed text-danger lg:text-sm"
          >
            {errorMessage}
          </p>
        )}

        <Button variant="primary" size="md"
          type="submit"
          disabled={pending || previewActive}
          className="mt-1! min-h-10! h-10! w-full! rounded-md! bg-action-primary! px-4! text-sm! font-bold! text-on-action-primary! shadow-[0_4px_10px_rgba(10,122,18,0.3)]! transition! hover:bg-action-primary-hover! active:bg-action-primary-pressed! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:cursor-not-allowed! disabled:bg-action-disabled! disabled:text-fg-disabled! lg:h-[44px]! lg:text-base!"
        >
          {pending ? "Enviando enlace…" : "Enviar enlace"}
        </Button>

        <p className="text-center text-xs text-fg-muted lg:text-sm">
          ¿No tenés cuenta?{" "}
          <Link href="/signup" className="font-semibold text-link underline-offset-2 hover:underline">
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
