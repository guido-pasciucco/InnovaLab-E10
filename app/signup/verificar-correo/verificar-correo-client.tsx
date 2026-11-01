"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import type { EmailVerificationState, ResendVerificationState } from "@/lib/types/auth";

import { checkEmailVerification, resendVerificationEmail } from "./actions";

const RESEND_COOLDOWN_SECONDS = 60;

// Where the user goes once the session proves the email is confirmed.
// The post-confirmation onboarding screen does not exist yet.
const NEXT_STEP = "/";

const initialCheckState: EmailVerificationState = undefined;

// The catalog owns the codes; the screen owns the Spanish copy. Rate limits
// are the case the user must understand, not a raw backend message.
const RESEND_ERROR_MESSAGES: Partial<Record<string, string>> = {
  AUTH_RATE_LIMITED:
    "Enviamos demasiados correos seguidos. Esperá unos minutos y volvé a intentar.",
  AUTH_EMAIL_RESEND_FAILED:
    "No pudimos reenviar el correo. Volvé a intentar en unos instantes.",
  AUTH_UNAVAILABLE:
    "El servicio de correo no está disponible. Volvé a intentar en unos instantes.",
};

const CHECK_ERROR_MESSAGES: Partial<Record<string, string>> = {
  AUTH_UNAVAILABLE:
    "No pudimos verificar tu correo. Volvé a intentar en unos instantes.",
};

function messageFor(
  messages: Partial<Record<string, string>>,
  code: string,
  fallback: string,
): string {
  return messages[code] ?? fallback;
}

type VerifyEmailClientProps = {
  email: string;
};

export default function VerifyEmailClient({ email }: VerifyEmailClientProps) {
  const router = useRouter();
  const [resendState, setResendState] = useState<ResendVerificationState>(undefined);
  const [resending, startResend] = useTransition();
  const [checkState, checkAction, checking] = useActionState(
    checkEmailVerification,
    initialCheckState,
  );
  const [cooldown, setCooldown] = useState(0);

  const hasEmail = email.length > 0;
  const isConfirmed = checkState?.ok === true && checkState.data.confirmed;
  const isNotConfirmed = checkState?.ok === true && !checkState.data.confirmed;

  // The cooldown starts only after a successful resend; a failed one lets
  // the user retry as soon as they fix whatever went wrong.
  function handleResend() {
    if (!hasEmail || resending || cooldown > 0) return;
    startResend(async () => {
      const result = await resendVerificationEmail(undefined, { email });
      setResendState(result);
      if (result.ok) setCooldown(RESEND_COOLDOWN_SECONDS);
    });
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!isConfirmed) return;
    router.push(NEXT_STEP);
    router.refresh();
  }, [isConfirmed, router]);

  return (
    <div className="mt-6 flex flex-col gap-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!hasEmail || checking || isConfirmed) return;
          dispatchInTransition(checkAction)({ email });
        }}
      >
        <button
          type="submit"
          disabled={!hasEmail || checking || isConfirmed}
          className="h-11 w-full rounded-md bg-[#0a7a12] px-4 text-sm font-bold text-white shadow-[0_4px_10px_rgba(10,122,18,0.25)] transition hover:bg-[#08640e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a7a12] disabled:cursor-not-allowed disabled:bg-[#b5eebe] disabled:text-[#103b1c]"
        >
          {checking ? "Verificando…" : "Ya verifiqué mi correo"}
        </button>
      </form>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleResend();
        }}
      >
        <button
          type="submit"
          disabled={!hasEmail || resending || cooldown > 0}
          className="h-11 w-full rounded-md border border-[#b7c9bb] bg-white px-4 text-sm font-semibold text-[#17351f] transition hover:border-[#168a3d] hover:bg-[#f4fcf6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168a3d] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-[#6a806f]"
        >
          {resending
            ? "Reenviando…"
            : cooldown > 0
              ? `Reenviar en ${cooldown} s`
              : "Reenviar correo"}
        </button>
      </form>

      {cooldown > 0 && (
        <p className="text-center text-xs text-[#5c7563]">
          Podés pedir otro enlace en {cooldown} segundos.
        </p>
      )}

      <Link
        href={hasEmail ? `/signup?email=${encodeURIComponent(email)}` : "/signup"}
        className="mt-1 text-center text-sm font-semibold text-[#136831] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#136831]"
      >
        Cambiar correo
      </Link>

      <div>
        {isConfirmed && (
          <p
            role="status"
            className="mt-1 rounded-md border border-[#b7e7c5] bg-[#effbf2] px-3 py-2 text-xs text-[#215c33]"
          >
            Correo confirmado. Redirigiendo…
          </p>
        )}

        {isNotConfirmed && (
          <p
            role="status"
            className="mt-1 rounded-md border border-[#f0dfa8] bg-[#fff9e5] px-3 py-2 text-xs text-[#6b5610]"
          >
            Todavía no figura confirmado. Abrí el enlace del correo y volvé a intentar.
          </p>
        )}

        {checkState && !checkState.ok && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {messageFor(CHECK_ERROR_MESSAGES, checkState.code, checkState.message)}
          </p>
        )}

        {resendState?.ok && (
          <p
            role="status"
            className="mt-1 rounded-md border border-[#b7e7c5] bg-[#effbf2] px-3 py-2 text-xs text-[#215c33]"
          >
            Te enviamos un nuevo enlace a {email}.
          </p>
        )}

        {resendState && !resendState.ok && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {messageFor(RESEND_ERROR_MESSAGES, resendState.code, resendState.message)}
          </p>
        )}
      </div>
    </div>
  );
}
