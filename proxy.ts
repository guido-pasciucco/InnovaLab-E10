import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Proxy (Next 16's name for middleware) runs on every matched request to
// refresh the Supabase session. See lib/supabase/proxy for the cookie flow.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Exclude Next.js internals, static assets and image optimization
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
