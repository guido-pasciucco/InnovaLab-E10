import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  email: z.email(),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const { client } = createServerSupabaseClient(request);
    // Use current origin as redirect target for PKCE code exchange.
    const origin = request.nextUrl.origin;
    const { error } = await client.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${origin}/update-password`,
    });

    if (error) {
      // Do not reveal whether email exists — return generic success to
      // prevent account enumeration. Log server-side is omitted here to
      // avoid leaking internals to client.
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Authentication unavailable" }, { status: 500 });
  }
}
