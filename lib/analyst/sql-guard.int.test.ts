import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDrizzleClient, type Db } from "@/lib/db/client";

import { loadTestEnv } from "../../tests/support/test-env";
import { validateAnalystSql } from "./sql-guard";
import { ACCEPTED } from "./sql-guard.fixtures";

// Every query the validator accepts must also run in Postgres as the real role.
// Otherwise the validator would hand the model a query that then fails at
// execution (a function that does not exist, a wrong view name).

let db: Db;

beforeAll(() => {
  process.env.DATABASE_URL = loadTestEnv().DATABASE_URL;
  globalThis.__drizzleClient = undefined;
  db = getDrizzleClient();
});

afterAll(async () => {
  try {
    if (db) await db.$client.end();
  } finally {
    globalThis.__drizzleClient = undefined;
  }
});

describe("validateAnalystSql against Postgres", () => {
  it.each(ACCEPTED)("runs %s as analyst_reader", async (_name, query) => {
    const result = await validateAnalystSql(query);
    if (!result.ok) throw new Error(`validator rejected: ${result.reason}`);

    const run = db.transaction(async (tx) => {
      await tx.execute(sql`set local role analyst_reader`);
      await tx.execute(sql`set local search_path = analyst`);
      // A newline before the closing parenthesis keeps a trailing `--` comment
      // in the query from swallowing it.
      return tx.execute(sql.raw(`select * from (\n${result.sql}\n) as q limit 31`));
    });

    await expect(run).resolves.toBeDefined();
  });
});
