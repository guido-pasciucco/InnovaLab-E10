import { assertLocalUrl, loadTestEnv } from "../support/test-env";

// Fails fast with an actionable message when the local stack is not up,
// instead of letting every spec time out on auth or Mailpit calls.
export default async function globalSetup(): Promise<void> {
  const env = loadTestEnv();
  assertLocalUrl("NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL);

  const checks: Array<[string, string, Record<string, string>]> = [
    [
      "Supabase Auth",
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`,
      { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
    ],
    ["Mailpit", `${env.MAILPIT_URL}/api/v1/info`, {}],
  ];

  for (const [name, url, headers] of checks) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      throw new Error(
        `[e2e] ${name} is not reachable at ${url} (${String(error)}). ` +
          "Run `bun run supabase:start` and `bun run db:migrate:local` first.",
      );
    }
  }
}
