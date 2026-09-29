import { type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updatePasswordService } from "@/lib/services/auth";
import { ok, handleRouteErrors } from "@/lib/errors/handle-route-errors";

export const POST = handleRouteErrors(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);

  const { client, applyCookies } = createServerSupabaseClient(request);
  await updatePasswordService(client, body);

  return applyCookies(ok({ ok: true }));
}, "AUTH_UNAVAILABLE");
