import { type NextRequest, NextResponse } from "next/server";
import { createProxySupabaseClient } from "@/lib/supabase/proxy";

// Proxy runs on every matched request to refresh the Supabase session.
// getClaims is preferred over getUser in the proxy because it validates
// the JWT locally without a network round-trip; if the token is expired,
// Supabase will rotate it and set refreshed cookies via setAll.
export async function proxy(request: NextRequest) {
  // Clone response that will carry refreshed cookies back to the browser.
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createProxySupabaseClient(request, response);
    // Refresh session — lightweight JWT verification, triggers setAll if rotation needed.
    await supabase.auth.getClaims();
  } catch {
    // Missing env or transient auth error: do not block the request.
    // Route handlers will return controlled 500 when env is missing.
    // For auth errors we still return the response without refreshed cookies.
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude Next.js internals, static assets and image optimization
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
