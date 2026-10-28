import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { CookiePersistenceError } from "@/lib/errors/cookie-persistence-error";

// RSC reads cannot persist cookies. The proxy owns session renewal and
// forwards refreshed cookies to both the rendered request and the browser.
export function createRscSupabaseClient() {
  return createSessionClient(false);
}

// Actions and Route Handlers must persist auth changes (including PKCE).
// Never use the read-only client for a mutation.
export function createWritableSupabaseClient() {
  return createSessionClient(true);
}

async function createSessionClient(writable: boolean) {
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
        if (!writable) return;
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch (error) {
          unstable_rethrow(error);
          // Auth SDK subscribers can log a thrown error before the door sees
          // it. Do not forward arbitrary cookie errors or causes containing tokens.
          throw new CookiePersistenceError();
        }
      },
    },
  });
}
