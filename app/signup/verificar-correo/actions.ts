"use server";

import z from "zod";

import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { verificationEmailSchema } from "@/lib/schemas/auth/auth";
import { getEmailVerificationStatusService, resendSignupEmailService } from "@/lib/services/auth";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";
import type { EmailVerificationState, ResendVerificationState } from "@/lib/types/auth";

// Action doors for the verification screen. The client creates the Supabase
// client from cookies, so the session re-read sees exactly what the browser
// has; handleActionErrors turns any failure into serializable form state.
export const resendVerificationEmail = handleActionErrors(
  async (_prevState: ResendVerificationState, data: z.infer<typeof verificationEmailSchema>) =>
    resendSignupEmailService(await createRscSupabaseClient(), data),
  "AUTH_UNAVAILABLE",
);

export const checkEmailVerification = handleActionErrors(
  async (_prevState: EmailVerificationState, data: z.infer<typeof verificationEmailSchema>) =>
    getEmailVerificationStatusService(await createRscSupabaseClient(), data),
  "AUTH_UNAVAILABLE",
);
