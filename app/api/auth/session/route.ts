import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { client, applyCookies } = createServerSupabaseClient(request);
    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = NextResponse.json({
      user: { id: data.user.id, email: data.user.email },
    });
    // getUser may trigger a refresh — propagate cookies if middleware did not already.
    return applyCookies(response);
  } catch {
    return NextResponse.json({ error: "Authentication unavailable" }, { status: 500 });
  }
}
