import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refreshes the Supabase session for the Next.js proxy (formerly
// middleware), following the official @supabase/ssr pattern:
// setAll writes the rotated cookies to the request first, then rebuilds
// the pass-through response from that request, so the page rendered in
// this same request reads the fresh token (not the stale one), and
// finally sets them on the response so the browser stores them.
// getClaims is preferred over getUser here: it validates the JWT locally
// and only hits the network when the token must be rotated.
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Missing env must not block the request: pages and actions fail
  // with their own controlled errors.
  if (!supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Cache headers that keep CDNs from serving one user's cookies to another.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // Transient auth error: do not block the request. The response
    // carries whatever cookies were written before the failure.
  }

  return response;
}
