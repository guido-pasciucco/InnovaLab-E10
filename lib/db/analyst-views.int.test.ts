import { sql, type SQL } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ANALYST_VIEWS, type AnalystView } from "@/lib/analyst/views";
import { getDrizzleClient, type Db } from "@/lib/db/client";

import { seedAnalystData } from "../../tests/support/factories/analyst-data";
import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";

// Guards the schema `analyst` (migration chat_datos_analyst_views): the only
// thing the chat agent can read. Each view must return the rows of the session
// user and nothing else, and the role must not reach anything outside it.

// Same list the SQL validator uses: the "exactly the views" test below fails if
// the database and the validator disagree.
const VIEWS = ANALYST_VIEWS;
type ViewName = AnalystView;

// Views Postgres opens to every role by default (extension statistics). They
// show query shapes, never row values; the SQL validator still limits the
// agent to `analyst`. Anything else readable by the role fails the test.
const READABLE_OUTSIDE_ANALYST = [
  "extensions.pg_stat_statements",
  "extensions.pg_stat_statements_info",
];

// 42501 permission denied, 55000 view not updatable, 42809 wrong object type.
const DENIED_WRITE_CODES = ["42501", "55000", "42809"];

let db: Db;
let userA: CreatedUser;
let userB: CreatedUser;
let idsA: Record<ViewName, string>;
let idsB: Record<ViewName, string>;

beforeAll(async () => {
  process.env.DATABASE_URL = loadTestEnv().DATABASE_URL;
  globalThis.__drizzleClient = undefined;
  db = getDrizzleClient();
  userA = await createUser();
  userB = await createUser();
  idsA = (await seedAnalystData(db, userA.id, "A")).ids;
  idsB = (await seedAnalystData(db, userB.id, "B")).ids;
});

afterAll(async () => {
  try {
    await Promise.allSettled([userA, userB].filter(Boolean).map((user) => deleteUser(user.id)));
    if (db) await db.$client.end();
  } finally {
    globalThis.__drizzleClient = undefined;
  }
});

// Runs a statement the way the executor will: inside a transaction, with the
// session user written to `app.user_id`, as the role `analyst_reader`.
async function asAnalyst(userId: string | null, statement: SQL): Promise<Record<string, unknown>[]> {
  return db.transaction(async (tx) => {
    if (userId !== null) {
      await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    }
    await tx.execute(sql`set local role analyst_reader`);
    return [...(await tx.execute(statement))];
  });
}

const selectIds = (view: ViewName): SQL => sql.raw(`select id from analyst.${view}`);

describe("analyst views", () => {
  it.each(VIEWS)("returns only the session user's row in %s", async (view) => {
    const rowsA = await asAnalyst(userA.id, selectIds(view));
    const rowsB = await asAnalyst(userB.id, selectIds(view));

    expect(rowsA).toEqual([{ id: idsA[view] }]);
    expect(rowsB).toEqual([{ id: idsB[view] }]);
  });

  it.each(VIEWS)("returns no rows from %s when no user is set", async (view) => {
    const rows = await asAnalyst(null, selectIds(view));

    expect(rows).toHaveLength(0);
  });

  it.each(VIEWS)("returns no rows from %s for an empty or unknown user", async (view) => {
    const empty = await asAnalyst("", selectIds(view));
    const unknown = await asAnalyst(crypto.randomUUID(), selectIds(view));

    expect(empty).toHaveLength(0);
    expect(unknown).toHaveLength(0);
  });

  it("describes every view and column with a comment", async () => {
    const rows = await db.execute(sql`
      SELECT c.relname AS view, a.attname AS column
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
      WHERE n.nspname = 'analyst'
        AND c.relkind = 'v'
        AND coalesce(btrim(col_description(c.oid, a.attnum)), '') = ''
    `);
    const views = await db.execute(sql`
      SELECT c.relname AS view
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'analyst'
        AND c.relkind = 'v'
        AND coalesce(btrim(obj_description(c.oid, 'pg_class')), '') = ''
    `);

    expect([...rows]).toEqual([]);
    expect([...views]).toEqual([]);
  });

  it("exposes exactly the views the agent knows about", async () => {
    const rows = await db.execute(sql`
      SELECT c.relname AS name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'analyst' AND c.relkind IN ('r', 'v', 'm', 'p', 'f')
      ORDER BY 1
    `);

    expect(rows.map((row) => row.name)).toEqual([...VIEWS].sort());
  });
});

describe("analyst_reader role", () => {
  it.each([
    "public.products",
    "public.profiles",
    "public.supplies",
    "public.knowledge_chunks",
    "auth.users",
  ])("denies reading %s", async (table) => {
    const read = asAnalyst(userA.id, sql.raw(`select count(*) from ${table}`));

    await expect(read).rejects.toMatchObject({ cause: { code: "42501" } });
  });

  it.each([
    "insert into analyst.products (id) values (gen_random_uuid())",
    "update analyst.products set name = 'x'",
    "delete from analyst.products",
    "truncate analyst.products",
    "create table analyst.leak (id int)",
    "create table public.leak (id int)",
    "create view analyst.leak as select 1",
  ])("denies writing: %s", async (statement) => {
    const write = asAnalyst(userA.id, sql.raw(statement));

    // Joined views are not auto-updatable, so Postgres can refuse before it
    // checks privileges; either way nothing is written.
    await expect(write).rejects.toSatisfy((error: { cause?: { code?: string } }) =>
      DENIED_WRITE_CODES.includes(error.cause?.code ?? ""),
    );
    expect(await asAnalyst(userA.id, selectIds("products"))).toEqual([{ id: idsA.products }]);
  });

  it("returns only the session user's own id when it calls current_user_id", async () => {
    const rows = await asAnalyst(userA.id, sql`select analyst.current_user_id() as id`);

    expect(rows).toEqual([{ id: userA.id }]);
  });

  it("has only SELECT on the analyst views", async () => {
    const rows = await db.execute(sql`
      SELECT c.relname, p.priv
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      CROSS JOIN (VALUES ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) AS p(priv)
      WHERE n.nspname = 'analyst'
        AND c.relkind = 'v'
        AND has_table_privilege('analyst_reader', c.oid, p.priv)
    `);

    expect([...rows]).toEqual([]);
  });

  it("reads nothing outside analyst except the open extension statistics views", async () => {
    const rows = await db.execute(sql`
      SELECT n.nspname || '.' || c.relname AS name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'v', 'm', 'p', 'f')
        AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'analyst')
        AND has_table_privilege('analyst_reader', c.oid, 'SELECT')
      ORDER BY 1
    `);

    expect(rows.map((row) => row.name)).toEqual(READABLE_OUTSIDE_ANALYST);
  });

  it("is not a superuser, does not bypass RLS and cannot log in", async () => {
    const [role] = await db.execute(sql`
      SELECT rolsuper, rolbypassrls, rolcanlogin, rolcreaterole, rolcreatedb
      FROM pg_roles WHERE rolname = 'analyst_reader'
    `);

    expect(role).toEqual({
      rolsuper: false,
      rolbypassrls: false,
      rolcanlogin: false,
      rolcreaterole: false,
      rolcreatedb: false,
    });
  });
});

describe("anon and authenticated roles", () => {
  it.each(["anon", "authenticated"])("have no access to the analyst schema as %s", async (role) => {
    const [schema] = await db.execute(sql`
      SELECT has_schema_privilege(${role}, 'analyst', 'USAGE') AS usage
    `);
    const views = await db.execute(sql`
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'analyst'
        AND c.relkind = 'v'
        AND has_table_privilege(${role}, c.oid, 'SELECT')
    `);

    expect(schema.usage).toBe(false);
    expect([...views]).toEqual([]);
  });
});
