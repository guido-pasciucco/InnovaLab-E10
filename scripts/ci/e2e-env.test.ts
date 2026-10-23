import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { mapSupabaseEnv, readSupabaseEnv } from "./e2e-env";

// Parser-only fixtures: no .env.test is created and no services are contacted.
const status = [
  'API_URL="http://127.0.0.1:54321"',
  'DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"',
  'PUBLISHABLE_KEY="local-publishable"',
  'SECRET_KEY="local-secret"',
  'MAILPIT_URL="http://127.0.0.1:54324"',
  'JWT_SECRET="not-for-the-app"',
].join("\n");

describe("readSupabaseEnv", () => {
  it("keeps the mapping when status succeeds with the configured timeout", () => {
    const runStatus = vi.fn(() => ({ status: 0, stdout: status }));

    expect(readSupabaseEnv(runStatus)).toEqual(mapSupabaseEnv(status));
    expect(runStatus).toHaveBeenCalledWith(
      "bun", ["x", "supabase", "status", "-o", "env"],
      { encoding: "utf8", timeout: 60_000 },
    );
  });

  it("fails without exposing output when a child process times out", () => {
    // Exercise a real timeout quickly; the separate assertion above checks the production 60s limit.
    const timedOut = spawnSync(process.execPath, ["-e", "setTimeout(() => {}, 10_000)"], {
      encoding: "utf8",
      timeout: 100,
    });
    expect(timedOut.error).toHaveProperty("code", "ETIMEDOUT");
    const runStatus = vi.fn(() => ({ ...timedOut, stdout: "sensitive-output", stderr: "sensitive-error" }));

    expect(() => readSupabaseEnv(runStatus)).toThrow(
      "[e2e] Cannot read local Supabase status. Check that the stack is healthy.",
    );
  });

  it("fails without exposing output when status exits unsuccessfully", () => {
    const runStatus = vi.fn(() => ({ status: 1, stdout: "sensitive-output", stderr: "sensitive-error" }));

    expect(() => readSupabaseEnv(runStatus)).toThrow(
      "[e2e] Cannot read local Supabase status. Check that the stack is healthy.",
    );
  });
});

describe("mapSupabaseEnv", () => {
  it("maps CLI fields to the app environment without copying unrelated keys", () => {
    expect(mapSupabaseEnv(status)).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-publishable",
      SUPABASE_SECRET_KEY: "local-secret",
      SITE_URL: "http://127.0.0.1:3100",
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      DIRECT_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      MAILPIT_URL: "http://127.0.0.1:54324",
    });
  });

  it.each(["API_URL", "DB_URL", "PUBLISHABLE_KEY", "SECRET_KEY", "MAILPIT_URL"])(
    "fails without leaking values when %s is missing",
    (key) => {
      const incomplete = status.split("\n").filter((line) => !line.startsWith(key + "=")).join("\n");
      expect(() => mapSupabaseEnv(incomplete)).toThrow(`[e2e] supabase status did not return ${key}.`);
    },
  );

  it.each(["API_URL", "DB_URL", "MAILPIT_URL"])("rejects a remote host in %s", (key) => {
    const remote = status.replace(new RegExp(`${key}="[^"]*"`), `${key}="https://remote.example"`);
    expect(() => mapSupabaseEnv(remote)).toThrow("not a local host");
  });
});
