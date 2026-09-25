import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Input validation at the edge: strict contract before touching auth.
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  try {
    const { client, applyCookies } = createServerSupabaseClient(request);
    const { error } = await client.auth.signInWithPassword(parsed.data);

    if (error) {
      // Generic message: never leak internal auth details.
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // signInWithPassword creates a new session, so the fresh cookies
    // captured by setAll must be propagated onto this very response.
    return applyCookies(NextResponse.json({ ok: true }));
  } catch {
    return NextResponse.json({ error: "Authentication unavailable" }, { status: 500 });
  }
}
