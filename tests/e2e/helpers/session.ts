import { createServerClient } from "@supabase/ssr";
import { assertLocalUrl, loadTestEnv } from "../../support/test-env";

// Back-door sign-in for the e2e suite. Refuses to run unless the Supabase
// URL is local (loadTestEnv + an explicit re-check here).

export type SessionCookie = {
  name: string;
  value: string;
  maxAge?: number;
  sameSite?: "Lax" | "Strict" | "None";
};

function toPlaywrightSameSite(value: unknown): SessionCookie["sameSite"] {
  if (value === "strict" || value === true) return "Strict";
  if (value === "none") return "None";
  return "Lax";
}

// Signs in with email/password through `@supabase/ssr` (the same library and
// publishable key the app uses) and returns the auth cookies it would set.
// Reusing the library, instead of hand-building the cookie, keeps the name
// (`sb-<ref>-auth-token`), chunking and `base64-` encoding in sync with the
// app by construction.
export async function signInSessionCookies(email: string, password: string): Promise<SessionCookie[]> {
  const env = loadTestEnv();
  assertLocalUrl("NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL);

  const jar = new Map<string, SessionCookie>();
  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar.values()].map(({ name, value }) => ({ name, value })),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          if (!value || options.maxAge === 0) jar.delete(name);
          else jar.set(name, { name, value, maxAge: options.maxAge, sameSite: toPlaywrightSameSite(options.sameSite) });
        }
      },
    },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`[e2e] Back-door sign-in failed for ${email}: ${error.message}`);
  if (jar.size === 0) throw new Error("[e2e] Back-door sign-in produced no session cookies.");

  return [...jar.values()];
}
