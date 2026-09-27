import { type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logoutService } from "@/lib/services/auth";
import { ok, handleRouteErrors } from "@/lib/errors/handle-route-errors";

export const POST = handleRouteErrors(async (request: NextRequest) => {
  const { client, applyCookies } = createServerSupabaseClient(request);
  await logoutService(client);

  // signOut clears session cookies via setAll — propagate onto response.
  return applyCookies(ok({ ok: true }));
}, "AUTH_UNAVAILABLE");
