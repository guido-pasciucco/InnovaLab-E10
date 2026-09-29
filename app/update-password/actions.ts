"use server";

import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";
import { updatePasswordService } from "@/lib/services/auth";
import { passwordUpdateSchema } from "@/lib/schemas/auth/auth";
import { type PasswordUpdateState } from "@/lib/types/auth";
import z from "zod";

// Action door: the recovery session comes from cookies, never from
// client-sent ids. handleActionErrors turns any thrown error into form
// state, so no try/catch lives here. The confirm-match check stays
// client-side in the form; the service validates the password.
export const updatePassword = handleActionErrors(
  async (_prevState: PasswordUpdateState, data: z.infer<typeof passwordUpdateSchema>) =>
    updatePasswordService(await createRscSupabaseClient(), data),
  "AUTH_UNAVAILABLE",
);
