import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Factory for Server Components / Server Actions / Route Handlers that
// read the session. Uses next/headers cookies() which is read-only in
// Server Components — setAll is wrapped in try/catch so that the
// proxy-owned refresh can still write cookies when possible (Server
// Actions) without crashing RSC renders. This follows the official
// Supabase SSR pattern for Server Components: getAll from cookieStore,
// setAll best-effort with swallowed error.
export async function createRscSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies — the proxy handles refresh.
          // Swallow the error as recommended by Supabase SSR docs for RSC.
        }
      },
    },
  });
}
