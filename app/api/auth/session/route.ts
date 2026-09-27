import { type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionUserService } from "@/lib/services/auth";
import { ok, handleRouteErrors } from "@/lib/errors/handle-route-errors";

export const GET = handleRouteErrors(async (request: NextRequest) => {
  const { client, applyCookies } = createServerSupabaseClient(request);
  const user = await getSessionUserService(client);

  // getUser may trigger a refresh — propagate cookies if middleware did not already.
  return applyCookies(ok({ user }));
}, "AUTH_UNAVAILABLE");
