"use server";

import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";
import { logoutService } from "@/lib/services/auth";

// Action door for the dashboard sign-out button. Called directly (no form),
// it returns the result so the client can show failures inline instead of
// navigating blindly. handleActionErrors keeps unexpected throws out of
// the client; sign-out failures surface as AUTH_SIGNOUT_FAILED.
export const logout = handleActionErrors(
  async () => logoutService(await createRscSupabaseClient()),
  "AUTH_SIGNOUT_FAILED",
);
