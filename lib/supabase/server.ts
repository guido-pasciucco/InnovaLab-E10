import "server-only";

import { type NextRequest, type NextResponse } from "next/server";
import {
  createServerClient,
  parseCookieHeader,
  type CookieOptions,
} from "@supabase/ssr";

// Pending session cookie writes captured from setAll.
type PendingCookie = { name: string; value: string; options?: CookieOptions };

// Creates a Supabase client bound to the incoming request cookies.
// Fresh session cookies produced by signInWithPassword are collected by
// setAll and later attached to the login response via applyCookies.
export function createServerSupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  // Mutable cookie buffer created up front, before any auth call.
  const pendingCookies: PendingCookie[] = [];

  const client = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => parseCookieHeader(request.cookies.toString()),
      setAll: (cookiesToSet) => {
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  // Propagates the fresh session cookies onto the login response.
  // The route builds its NextResponse first, then applies them to it,
  // because signInWithPassword creates a new session on this response.
  function applyCookies(response: NextResponse): NextResponse {
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }
    return response;
  }

  return { client, applyCookies };
}
