import { type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requestPasswordResetService } from "@/lib/services/auth";
import { ok, handleRouteErrors } from "@/lib/errors/handle-route-errors";
import { getSiteOrigin } from "@/lib/site-origin";

export const POST = handleRouteErrors(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);

  const { client } = createServerSupabaseClient(request);
  // Server-resolved origin as redirect target for the PKCE code exchange.
  const redirectTo = `${getSiteOrigin(request.headers)}/update-password`;
  await requestPasswordResetService(client, body, redirectTo);

  return ok({ ok: true });
}, "AUTH_UNAVAILABLE");
