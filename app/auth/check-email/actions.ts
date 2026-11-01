"use server";

import { headers } from "next/headers";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";
import { getEmailVerificationStatusService, resendSignupConfirmationService } from "@/lib/services/auth";
import { getSiteOrigin } from "@/lib/site-origin";
import { type EmailVerificationState, type ResendSignupState } from "@/lib/types/auth";

// Action door: handleActionErrors turns any thrown error into form state.
// The service validates the email. The link origin is resolved on the server
// (never client-sent) and matches the one signup uses, so the resent link
// also lands on /auth/confirm and continues to the "account created" screen.
export const resendSignupConfirmation = handleActionErrors(
  async (_prevState: ResendSignupState, data: unknown) => {
    const emailRedirectTo = `${getSiteOrigin(await headers())}/auth/confirm?next=/auth/account-created`;
    return resendSignupConfirmationService(await createRscSupabaseClient(), data, emailRedirectTo);
  },
  "AUTH_UNAVAILABLE",
);

// Re-reads the session cookies to answer "is this email confirmed?". Success
// only when the session belongs to the shown address and is confirmed.
export const checkEmailVerification = handleActionErrors(
  async (_prevState: EmailVerificationState, data: unknown) =>
    getEmailVerificationStatusService(await createRscSupabaseClient(), data),
  "AUTH_UNAVAILABLE",
);
