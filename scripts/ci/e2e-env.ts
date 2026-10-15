import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { assertLocalUrl } from "../../tests/support/test-env";

// Output names verified against Supabase CLI v2.118.0:
// apps/cli/src/command-internal/status-values.ts in github.com/supabase/cli.
export function mapSupabaseEnv(output: string): Record<string, string> {
  const values = parseEnv(output);
  const required = (name: string) => {
    if (!values[name]) throw new Error(`[e2e] supabase status did not return ${name}.`);
    return values[name];
  };
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: required("API_URL"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: required("PUBLISHABLE_KEY"),
    SUPABASE_SECRET_KEY: required("SECRET_KEY"),
    SITE_URL: "http://127.0.0.1:3100",
    DATABASE_URL: required("DB_URL"),
    DIRECT_URL: required("DB_URL"),
    MAILPIT_URL: required("MAILPIT_URL"),
  };
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SITE_URL", "DATABASE_URL", "DIRECT_URL", "MAILPIT_URL"] as const) {
    assertLocalUrl(key, env[key]);
  }
  return env;
}

if (import.meta.main) {
  const result = spawnSync("bun", ["x", "supabase", "status", "-o", "env"], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    // Never echo raw status output: it contains administrative credentials.
    throw new Error("[e2e] Cannot read local Supabase status. Check that the stack is healthy.");
  }
  const env = mapSupabaseEnv(result.stdout);
  for (const value of Object.values(env)) {
    if (process.env.GITHUB_ACTIONS === "true") console.log(`::add-mask::${value}`);
  }
  writeFileSync(".env.test", Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n", { mode: 0o600 });
  console.log("[e2e] Local test environment generated.");
}
