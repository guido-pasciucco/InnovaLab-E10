import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  try {
    const { client, applyCookies } = createServerSupabaseClient(request);
    const { error } = await client.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { display_name: parsed.data.displayName } },
    });

    if (error) {
      // Generic message — do not leak whether email already exists.
      return NextResponse.json({ error: "Could not create account" }, { status: 400 });
    }

    // signUp may create a session immediately (if email confirmation is disabled)
    // or require confirmation. In both cases propagate any cookies set by Supabase.
    return applyCookies(NextResponse.json({ ok: true }));
  } catch {
    return NextResponse.json({ error: "Authentication unavailable" }, { status: 500 });
  }
}
