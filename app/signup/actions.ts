"use server";

import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";
import { signupService } from "@/lib/services/auth";
import { signupSchema } from "@/lib/schemas/auth/auth";
import { type SignupState } from "@/lib/types/auth";
import z from "zod";

// Action door: the client is created from cookies() (no Request) and
// session cookies are written straight to the store. handleActionErrors turns
// any thrown error into form state, so no try/catch lives here.
// Client-side RHF validation is UX only; the service revalidates.
export const signup = handleActionErrors(
  async (_prevState: SignupState, data: z.infer<typeof signupSchema>) =>
    signupService(await createRscSupabaseClient(), data),
  "AUTH_UNAVAILABLE",
);
