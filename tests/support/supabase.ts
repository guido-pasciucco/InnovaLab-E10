import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertLocalUrl, loadTestEnv } from "./test-env";

// Back-door client for the test process. It refuses to exist unless the
// Supabase URL is local (loadTestEnv + an explicit re-check here).

let admin: SupabaseClient | undefined;

// Admin API client (secret key). Test process only: bypasses RLS and can
// create/delete auth users, so it is never exposed to the app.
export function adminClient(): SupabaseClient {
  if (admin) return admin;
  const env = loadTestEnv();
  assertLocalUrl("NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL);
  admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
