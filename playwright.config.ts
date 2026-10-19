import { defineConfig, devices } from "@playwright/test";
import { isTestOnlyKey, loadTestEnv } from "./tests/support/test-env";

// E2E suite against a real local Supabase stack (see supabase/config.toml).
// Prerequisites: `bun run supabase:start` and `bun run db:migrate:local`.

// Loads `.env.test` into process.env (overriding `.env`) and aborts if any
// URL is not local. Must run before anything reads process.env.
const testEnv = loadTestEnv();
const appEnv = Object.fromEntries(Object.entries(testEnv).filter(([key]) => !isTestOnlyKey(key)));

// Non-default port so a running `next dev` on 3000 is never reused by
// mistake. Must match site_url / additional_redirect_urls in
// supabase/config.toml and SITE_URL in .env.test.
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

if (new URL(testEnv.SITE_URL).origin !== BASE_URL) {
  throw new Error(`[e2e] SITE_URL in .env.test must be ${BASE_URL} (the Playwright baseURL).`);
}

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  // Reject focused suites locally as well as in GitHub Actions.
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["json", { outputFile: "test-results/report.json" }]]
    : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Production build, not `next dev` (stable timing, no on-demand compile).
    // NEXT_PUBLIC_* are inlined at build time, so the build itself must get
    // the local values: both steps inherit `env` below. Invoke the Next CLI
    // through Node (not `bun run`) for Windows portability without re-injecting `.env`.
    // Note: this overwrites the production build in `.next/` with one wired
    // to local Supabase; `next dev` uses `.next/dev` and is not affected.
    command: `node node_modules/next/dist/bin/next build && node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    // Never attach to a server started with unknown env (it could be wired
    // to the hosted project).
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
    // Next still reads `.env` ("Environments: .env" in the build log), but
    // process env wins over `.env` files, so these local values are the ones
    // inlined and used at runtime.
    // Test-only keys (the Admin secret) are stripped: the app must never
    // run with admin privileges during the suite.
    env: { ...appEnv, NEXT_TELEMETRY_DISABLED: "1" },
  },
});
