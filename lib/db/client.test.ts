import { afterEach, describe, expect, it, vi } from "vitest";

// postgres() is lazy: it opens no socket until the first query, so these
// tests build a real client without a running database.
async function loadClientModule() {
  vi.resetModules();
  return import("./client");
}

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.__drizzleClient = undefined;
});

describe("getDb", () => {
  it("throws when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDb } = await loadClientModule();

    expect(() => getDb()).toThrow("Missing DATABASE_URL environment variable");
  });

  it("returns a Drizzle client with the query API for every table", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@127.0.0.1:6543/postgres");
    const { getDb } = await loadClientModule();

    const db = getDb();

    expect(db.query.profiles).toBeDefined();
    expect(db.query.businessCostLines).toBeDefined();
    expect(db.query.calcCostLines).toBeDefined();
  });

  it("reuses the same client across calls and module reloads", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@127.0.0.1:6543/postgres");
    const first = (await loadClientModule()).getDb();
    const second = (await loadClientModule()).getDb();

    expect(second).toBe(first);
  });
});
