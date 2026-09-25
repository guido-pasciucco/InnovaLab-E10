import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";

// Creates a Supabase client suitable for Next.js middleware.
// Refreshes the session on every request via getClaims (lightweight JWT check)
// and propagates refreshed cookies to both request and response so that
// getAll sees setAll changes within the same request lifecycle.
export function createMiddlewareSupabaseClient(
  request: NextRequest,
  response: NextResponse,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const client = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => parseCookieHeader(request.cookies.toString()),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          // Ensure getAll sees the refreshed value within this request
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  return client;
}
