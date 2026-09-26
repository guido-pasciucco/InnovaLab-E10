import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginService } from "@/lib/services/auth";

// Puerta HTTP (delgada): pasa la entrada cruda al servicio compartido
// y traduce su resultado a status codes. La validación vive en el
// servicio, no acá.
export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);

  try {
    const { client, applyCookies } = createServerSupabaseClient(request);
    const result = await loginService(client, body);

    if (!result.ok) {
      const statusByReason = {
        validation: 400,
        credentials: 401,
        unavailable: 500,
      } as const;
      return NextResponse.json({ error: result.error }, { status: statusByReason[result.reason] });
    }

    // signInWithPassword creates a new session, so the fresh cookies
    // captured by setAll must be propagated onto this very response.
    return applyCookies(NextResponse.json({ ok: true }));
  } catch {
    return NextResponse.json({ error: "Authentication unavailable" }, { status: 500 });
  }
}
