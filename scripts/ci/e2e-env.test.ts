import { describe, expect, it } from "vitest";
import { mapSupabaseEnv } from "./e2e-env";

// Parser-only fixtures: no .env.test is created and no services are contacted.
const status = [
  'API_URL="http://127.0.0.1:54321"',
  'DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"',
  'PUBLISHABLE_KEY="local-publishable"',
  'SECRET_KEY="local-secret"',
  'MAILPIT_URL="http://127.0.0.1:54324"',
  'JWT_SECRET="not-for-the-app"',
].join("\n");

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
