"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";

import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useTransportAwareAction } from "@/components/forms/use-transport-aware-action";
import type { ResendSignupState } from "@/lib/types/auth";

import { resendSignupConfirmation } from "./actions";
import { noopSubscribe, readSignupEmail } from "./signup-email";

const COOLDOWN_SECONDS = 60;
const initialState: ResendSignupState = undefined;

export function ResendButton() {
  const email = useSyncExternalStore(noopSubscribe, readSignupEmail, () => null);
  const { action, transportError } = useTransportAwareAction(resendSignupConfirmation);
  const [state, submitAction, pending] = useActionState(action, initialState);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const disabled = !email || pending || cooldown > 0;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!email) return;
          setCooldown(COOLDOWN_SECONDS);
          dispatchInTransition(submitAction)({ email });
        }}
        className="h-11 w-full rounded-lg border border-[#9fd9b0] bg-[#e4f5e9] px-4 text-sm font-bold text-[#136831] transition hover:bg-[#d6f0de] disabled:cursor-not-allowed disabled:opacity-60 lg:text-base"
      >
        {pending ? "Enviando…" : cooldown > 0 ? `Reenviar correo (${cooldown}s)` : "Reenviar correo"}
      </button>
      {state?.ok && <p role="status" className="text-center text-xs text-[#31503a]">Te lo reenviamos. Revisá tu bandeja de entrada.</p>}
      {state && !state.ok && <p role="alert" className="text-center text-xs text-red-600">{state.message}</p>}
      {transportError && <p role="alert" className="text-center text-xs text-red-600">{transportError}</p>}
    </>
  );
}
