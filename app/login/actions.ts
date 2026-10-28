"use server";

import { type LoginState } from "@/lib/types/auth";
import { createWritableSupabaseClient } from "@/lib/supabase/rsc";
import { loginService } from "@/lib/services/auth";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import z from "zod";
import { loginSchema } from "@/lib/schemas/auth/auth";

// Action door: the client is created from cookies() (no Request) and
// session cookies are written straight to the store. handleActionErrors turns
// any thrown error into form state, so no try/catch lives here.
// Client-side RHF validation is UX only; the service revalidates.
export const login = handleActionErrors(
  async (_prevState: LoginState, data: z.infer<typeof loginSchema>) =>
    loginService(await createWritableSupabaseClient(), data),
  "AUTH_UNAVAILABLE",
);
