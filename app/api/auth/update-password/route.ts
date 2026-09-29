import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid password" }, { status: 400 });
  }

  try {
    const { client, applyCookies } = createServerSupabaseClient(request);
    // Requires an active recovery session (user clicked email link and
    // middleware refreshed the session). updateUser sets the new password
    // for the authenticated user — user identity comes from the session,
    // never from client-sent ids.
    const { error } = await client.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return NextResponse.json({ error: "Could not update password" }, { status: 401 });
    }

    return applyCookies(NextResponse.json({ ok: true }));
  } catch {
    return NextResponse.json({ error: "Authentication unavailable" }, { status: 500 });
  }
}
