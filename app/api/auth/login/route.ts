import { type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginService } from "@/lib/services/auth";
import { ok, handleRouteErrors } from "@/lib/errors/handle-route-errors";

// Thin HTTP door: passes raw input to the shared service. Any thrown
// error (AppError, ZodError, Supabase down) is translated by handleRouteErrors.
export const POST = handleRouteErrors(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);

  const { client, applyCookies } = createServerSupabaseClient(request);
  await loginService(client, body);

  // signInWithPassword creates a new session, so the fresh cookies
  // captured by setAll must be propagated onto this very response.
  return applyCookies(ok({ ok: true }));
}, "AUTH_UNAVAILABLE");
