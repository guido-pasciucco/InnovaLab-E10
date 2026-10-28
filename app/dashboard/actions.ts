"use server";

import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { createWritableSupabaseClient } from "@/lib/supabase/rsc";
import { logoutService } from "@/lib/services/auth";
import { redirect } from "next/navigation";

// Action door for the dashboard sign-out button. Called directly (no form),
// it returns the result so the client can show failures inline instead of
// navigating blindly. handleActionErrors keeps unexpected throws out of
// the client; sign-out failures surface as AUTH_SIGNOUT_FAILED.
const logoutAction = handleActionErrors(
  async () => logoutService(await createWritableSupabaseClient()),
  "AUTH_SIGNOUT_FAILED",
);

export async function logout() {
  const result = await logoutAction();

  // Partial deletion can make the dashboard render as anonymous before client
  // state receives this result. Only a tracked successful provider response
  // confirms logout; every other local inconsistency gets a neutral notice.
  if (result.ok && !result.data.cookiesPersisted) {
    redirect(result.data.remote === "confirmed"
      ? "/login?notice=signed-out"
      : "/login?notice=sign-out-unknown");
  }
  if (result.ok && result.data.remote === "failed") redirect("/login?notice=sign-out-unknown");

  return result;
}
