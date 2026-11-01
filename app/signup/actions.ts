"use server";

import { headers } from "next/headers";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";
import { signupService } from "@/lib/services/auth";
import { signupSchema } from "@/lib/schemas/auth/auth";
import { getSiteOrigin } from "@/lib/site-origin";
import { type SignupState } from "@/lib/types/auth";
import z from "zod";

// Action door: the client is created from cookies() (no Request) and
// session cookies are written straight to the store. handleActionErrors turns
// any thrown error into form state, so no try/catch lives here.
// Client-side RHF validation is UX only; the service revalidates.
// The confirmation link origin is resolved on the server (SITE_URL), so dev
// and e2e each get their own port instead of the shared Supabase site_url.
export const signup = handleActionErrors(
  async (_prevState: SignupState, data: z.infer<typeof signupSchema>) => {
    const emailRedirectTo = `${getSiteOrigin(await headers())}/login`;
    return signupService(await createRscSupabaseClient(), data, emailRedirectTo);
  },
  "AUTH_UNAVAILABLE",
);
