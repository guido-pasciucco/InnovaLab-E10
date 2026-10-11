import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

// Loads `.env.test` for the test process (e2e and integration suites) and
// makes it win over anything already in process.env.
//
// Why this is needed:
// - `next build` / `next start` run with NODE_ENV=production, so Next never
//   reads `.env.test`; it would read `.env`, which points at the real hosted
//   Supabase project.
// - `bun run` also injects `.env` into the environment of every script.
// Process env beats `.env` files in Next, so overriding the variables here
// (and handing them to the webServer) keeps the whole run on local Supabase.

const ENV_FILE = ".env.test";

const REQUIRED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  // Admin key for the test process only (factories and fixtures). Never
  // NEXT_PUBLIC_, and never handed to the webServer (see TEST_ONLY_KEYS).
  "SUPABASE_SECRET_KEY",
  "SITE_URL",
  "DATABASE_URL",
  "MAILPIT_URL",
] as const;

// Every URL in `.env.test` must point at this machine.
const URL_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "SITE_URL", "DATABASE_URL", "DIRECT_URL", "MAILPIT_URL"];

// Keys the app under test must never see: they are kept out of process.env
// and playwright.config.ts also removes them from the webServer env. Code in
// the test process reads them from the `loadTestEnv()` return value.
export const TEST_ONLY_KEYS = ["SUPABASE_SECRET_KEY"] as const;

const LOCAL_HOSTS =new Set(["127.0.0.1", "localhost", "[::1]"]);

export type TestEnv = Record<(typeof REQUIRED_KEYS)[number], string> & Record<string, string>;

export function assertLocalUrl(key: string, value: string): void {
  let host: string;
  try {
    host = new URL(value).hostname;
  } catch {
    throw new Error(`[test] ${key} in ${ENV_FILE} is not a valid URL.`);
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `[test] Refusing to run: ${key} points at "${host}", not a local host. ` +
        "Tests must only talk to the local Supabase stack.",
    );
  }
}

export function loadTestEnv(rootDir: string = process.cwd()): TestEnv {
  const file = path.join(rootDir, ENV_FILE);
  if (!existsSync(file)) {
    throw new Error(
      `[test] Missing ${ENV_FILE}. Copy .env.test.example to ${ENV_FILE} and fill it ` +
        "with the values from `bunx supabase status`.",
    );
  }

  const parsed = parseEnv(readFileSync(file, "utf8"));
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) env[key] = value;
  }

  for (const key of REQUIRED_KEYS) {
    if (!env[key]) throw new Error(`[test] ${key} is missing in ${ENV_FILE}.`);
  }
  for (const key of URL_KEYS) {
    if (env[key]) assertLocalUrl(key, env[key]);
  }

  // Override on purpose: values injected from `.env` must never survive.
  // Test-only keys stay out of process.env: Playwright spawns the webServer
  // with `...process.env`, so anything placed there would reach the app.
  for (const [key, value] of Object.entries(env)) {
    if (isTestOnlyKey(key)) delete process.env[key];
    else process.env[key] = value;
  }

  return env as TestEnv;
}

export function isTestOnlyKey(key: string): boolean {
  return (TEST_ONLY_KEYS as readonly string[]).includes(key);
}
