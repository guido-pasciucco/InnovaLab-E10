import { type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginService } from "@/lib/services/auth";
import { fail, ok, withApi } from "@/lib/api/respond";

// Puerta HTTP (delgada): pasa la entrada cruda al servicio compartido
// y traduce su resultado con fail()/ok(). La validación vive en el
// servicio, no acá. withApi cubre throws inesperados (env, Supabase
// caído) con el mismo 500 de antes.
export const POST = withApi(async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);

  const { client, applyCookies } = createServerSupabaseClient(request);
  const result = await loginService(client, body);

  if (!result.ok) {
    return fail(result.code, result.details);
  }

  // signInWithPassword creates a new session, so the fresh cookies
  // captured by setAll must be propagated onto this very response.
  return applyCookies(ok({ ok: true }));
});
