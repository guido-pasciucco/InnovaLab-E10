import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ANALYST_VIEWS } from "@/lib/analyst/views";
import { getDrizzleClient, type Db } from "@/lib/db/client";

import { loadTestEnv } from "../../tests/support/test-env";
import { clearAnalystSchemaCache, getAnalystSchemaDescriptionService } from "./analyst-schema";

// Integration against local Postgres: the description the model reads must
// list every column of every view the validator allows.

let db: Db;

beforeAll(() => {
  process.env.DATABASE_URL = loadTestEnv().DATABASE_URL;
  globalThis.__drizzleClient = undefined;
  db = getDrizzleClient();
});

beforeEach(() => {
  clearAnalystSchemaCache();
});

afterAll(async () => {
  try {
    if (db) await db.$client.end();
  } finally {
    globalThis.__drizzleClient = undefined;
  }
});

describe("getAnalystSchemaDescriptionService", () => {
  it("describes every allowed view and every one of its columns", async () => {
    const description = await getAnalystSchemaDescriptionService(db);
    const columns = await db.execute<{ table_name: string; column_name: string }>(sql`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'analyst' and table_name in ${[...ANALYST_VIEWS]}
    `);

    expect([...columns].length).toBeGreaterThan(ANALYST_VIEWS.length);
    for (const view of ANALYST_VIEWS) {
      expect(description).toContain(`Vista ${view}`);
    }
    for (const { table_name, column_name } of columns) {
      const viewBlock = description.split("\n\n").find((block) => block.startsWith(`Vista ${table_name}`));
      expect(viewBlock, `${table_name}.${column_name}`).toContain(`  - ${column_name} (`);
    }
  });

  it("carries the Spanish comments the model relies on", async () => {
    const description = await getAnalystSchemaDescriptionService(db);
    expect(description).toContain("pesos argentinos (ARS)");
    expect(description).toContain("AAAA-MM");
  });

  it("reads once and keeps the result", async () => {
    const first = await getAnalystSchemaDescriptionService(db);
    const failing = { execute: () => Promise.reject(new Error("must not be called")) } as unknown as Db;
    await expect(getAnalystSchemaDescriptionService(failing)).resolves.toBe(first);
  });

  it("does not keep a failed read", async () => {
    const failing = { execute: () => Promise.reject(new Error("connection lost")) } as unknown as Db;
    await expect(getAnalystSchemaDescriptionService(failing)).rejects.toThrow("connection lost");
    await expect(getAnalystSchemaDescriptionService(db)).resolves.toContain("Vista products");
  });
});
