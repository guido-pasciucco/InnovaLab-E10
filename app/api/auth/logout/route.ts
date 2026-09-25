import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { client, applyCookies } = createServerSupabaseClient(request);
    const { error } = await client.auth.signOut();

    if (error) {
      return NextResponse.json({ error: "Could not sign out" }, { status: 500 });
    }

    // signOut clears session cookies via setAll — propagate onto response.
    return applyCookies(NextResponse.json({ ok: true }));
  } catch {
    return NextResponse.json({ error: "Authentication unavailable" }, { status: 500 });
  }
}
