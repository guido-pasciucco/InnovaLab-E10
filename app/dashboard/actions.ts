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

  // The remote session has already closed, but partial cookie deletion can
  // make the dashboard render as anonymous before client state receives this
  // result. Redirect explicitly to a safe public page with a non-sensitive notice.
  if (result.ok && !result.data.cookiesPersisted) redirect("/login?notice=signed-out");

  return result;
}
