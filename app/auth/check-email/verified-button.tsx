"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useSyncExternalStore } from "react";

import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useTransportAwareAction } from "@/components/forms/use-transport-aware-action";
import type { EmailVerificationState } from "@/lib/types/auth";

import { checkEmailVerification } from "./actions";
import { noopSubscribe, readSignupEmail } from "./signup-email";

const NEXT_STEP = "/auth/account-created";
const initialState: EmailVerificationState = undefined;

// Moves on only when the server confirms a session for the shown address;
// otherwise it says the email is not confirmed yet, never success.
export function VerifiedButton() {
  const router = useRouter();
  const email = useSyncExternalStore(noopSubscribe, readSignupEmail, () => null);
  const { action, transportError } = useTransportAwareAction(checkEmailVerification);
  const [state, submitAction, pending] = useActionState(action, initialState);

  const confirmed = state?.ok === true && state.data.confirmed;
  const notConfirmed = state?.ok === true && !state.data.confirmed;

  useEffect(() => {
    if (confirmed) router.push(NEXT_STEP);
  }, [confirmed, router]);

  return (
    <>
      <button
        type="button"
        disabled={!email || pending || confirmed}
        onClick={() => email && dispatchInTransition(submitAction)({ email })}
        className="flex h-11 w-full items-center justify-center rounded-lg bg-[#168a3d] px-4 text-sm font-bold text-white shadow-[0_4px_10px_rgba(22,138,61,0.35)] transition hover:bg-[#127a35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168a3d] disabled:cursor-not-allowed disabled:opacity-60 lg:text-base"
      >
        {pending ? "Verificando…" : "Ya verifiqué mi correo"}
      </button>
      {notConfirmed && <p role="status" className="text-center text-xs text-[#31503a]">Todavía no figura confirmado. Abrí el enlace del correo y volvé a intentar.</p>}
      {state && !state.ok && <p role="alert" className="text-center text-xs text-red-600">{state.message}</p>}
      {transportError && <p role="alert" className="text-center text-xs text-red-600">{transportError}</p>}
    </>
  );
}
