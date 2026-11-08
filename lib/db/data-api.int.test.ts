import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDrizzleClient, type Db } from "@/lib/db/client";

import { loadTestEnv } from "../../tests/support/test-env";

// Guards the closed public Data API (PostgREST): see
// drizzle/20261107231944_revoke-public-rest-api.sql. If a future migration
// grants table privileges back to `anon`/`authenticated`, this suite fails.

let db: Db;

beforeAll(() => {
  process.env.DATABASE_URL = loadTestEnv().DATABASE_URL;
  db = getDrizzleClient();
});

afterAll(async () => {
  await db.$client.end();
});

describe("public schema", () => {
  it("grants no table privileges to anon or authenticated", async () => {
    const rows = await db.execute(sql`
      SELECT c.relname, r.role, p.priv
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(role)
      CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) AS p(priv)
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND has_table_privilege(r.role, c.oid, p.priv)
    `);

    expect(rows).toHaveLength(0);
  });

  it("keeps table privileges for service_role", async () => {
    const rows = await db.execute(sql`
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND has_table_privilege('service_role', c.oid, 'SELECT')
    `);

    expect(rows.length).toBeGreaterThan(0);
  });
});
