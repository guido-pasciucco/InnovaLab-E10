import { type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { signupService } from "@/lib/services/auth";
import { ok, handleRouteErrors } from "@/lib/errors/handle-route-errors";

export const POST = handleRouteErrors(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);

  const { client, applyCookies } = createServerSupabaseClient(request);
  await signupService(client, body);

  // signUp may create a session immediately (if email confirmation is disabled)
  // or require confirmation. In both cases propagate any cookies set by Supabase.
  return applyCookies(ok({ ok: true }));
}, "AUTH_UNAVAILABLE");
