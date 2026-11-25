import { sql } from "drizzle-orm";
import { ZodError } from "zod";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ANALYST_VIEWS } from "@/lib/analyst/views";
import { getDrizzleClient, type Db } from "@/lib/db/client";

import { seedAnalystData, seedExpenses, type SeededAnalystData } from "../../tests/support/factories/analyst-data";
import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { ANALYST_MAX_ROWS, runAnalystQueryService } from "./analyst-query";

// Integration against local Postgres. The chat agent's whole data path, minus
// the model: validator, read-only transaction, role, views, limits. User A is
// the session user; B is who A must never reach; C owns many rows.

const EXTRA_EXPENSES = 300;

let db: Db;
let userA: CreatedUser;
let userB: CreatedUser;
let userC: CreatedUser;
let dataA: SeededAnalystData;
let dataB: SeededAnalystData;

beforeAll(async () => {
  process.env.DATABASE_URL = loadTestEnv().DATABASE_URL;
  globalThis.__drizzleClient = undefined;
  db = getDrizzleClient();
  userA = await createUser();
  userB = await createUser();
  userC = await createUser();
  dataA = await seedAnalystData(db, userA.id, "A");
  dataB = await seedAnalystData(db, userB.id, "B");
  const dataC = await seedAnalystData(db, userC.id, "C");
  await seedExpenses(db, dataC.businessId, EXTRA_EXPENSES);
});

afterAll(async () => {
  try {
    await Promise.allSettled([userA, userB, userC].filter(Boolean).map((user) => deleteUser(user.id)));
    if (db) await db.$client.end();
  } finally {
    globalThis.__drizzleClient = undefined;
  }
});

describe("runAnalystQueryService results", () => {
  it("returns the columns and rows of the session user", async () => {
    const result = await runAnalystQueryService(
      userA.id,
      "select concept, amount_period from analyst.business_expenses;",
      {},
      db,
    );

    expect(result).toMatchObject({
      sql: "select concept, amount_period from analyst.business_expenses",
      columns: ["concept", "amount_period"],
      rows: [{ concept: "Alquiler A", amount_period: "1000.00" }],
      truncated: false,
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns dates, numerics, big integers, booleans and nulls as JSON safe values", async () => {
    const result = await runAnalystQueryService(
      userA.id,
      "select created_at, count(*) over () as n, variable_cost_unit_amount, is_active, sku_or_slug from analyst.products",
      {},
      db,
    );

    const [row] = result.rows;
    expect(typeof row.created_at).toBe("string");
    expect(["string", "number"]).toContain(typeof row.n);
    expect(row.variable_cost_unit_amount).toBeNull();
    expect(row.is_active).toBe(true);
    expect(JSON.parse(JSON.stringify(result.rows))).toEqual(result.rows);
  });

  it("works when the query ends with a line comment", async () => {
    const result = await runAnalystQueryService(userA.id, "select count(*) as n from analyst.products -- cuántos", {}, db);

    expect(Number(result.rows[0].n)).toBe(1);
  });

  it("cuts a long listing at the row limit and says so, while totals still count every row", async () => {
    const listing = await runAnalystQueryService(userC.id, "select concept from analyst.business_expenses order by concept", {}, db);
    const total = await runAnalystQueryService(userC.id, "select count(*) as n from analyst.business_expenses", {}, db);

    expect(listing.rows).toHaveLength(ANALYST_MAX_ROWS);
    expect(listing.truncated).toBe(true);
    expect(Number(total.rows[0].n)).toBe(EXTRA_EXPENSES + 1);
    expect(total.truncated).toBe(false);
  });

  it("returns every row when the limit is raised above the number of rows", async () => {
    const listing = await runAnalystQueryService(
      userC.id,
      "select concept from analyst.business_expenses",
      { maxRows: 500 },
      db,
    );

    expect(listing.rows).toHaveLength(EXTRA_EXPENSES + 1);
    expect(listing.truncated).toBe(false);
  });

  it("rejects options outside the allowed range", async () => {
    const run = runAnalystQueryService(userA.id, "select 1", { maxRows: 0 }, db);

    await expect(run).rejects.toBeInstanceOf(ZodError);
  });
});

describe("runAnalystQueryService isolation", () => {
  it.each(ANALYST_VIEWS)("returns only the session user's row from %s", async (view) => {
    const asA = await runAnalystQueryService(userA.id, `select id from analyst.${view}`, {}, db);
    const asB = await runAnalystQueryService(userB.id, `select id from analyst.${view}`, {}, db);

    expect(asA.rows).toEqual([{ id: dataA.ids[view] }]);
    expect(asB.rows).toEqual([{ id: dataB.ids[view] }]);
  });

  it("keeps users apart when their queries run at the same time", async () => {
    const calls = Array.from({ length: 24 }, (_, index) => {
      const user = index % 2 === 0 ? userA : userB;
      return runAnalystQueryService(user.id, "select name from analyst.products", {}, db).then((result) => ({
        label: index % 2 === 0 ? "A" : "B",
        names: result.rows.map((row) => row.name),
      }));
    });

    const results = await Promise.all(calls);

    expect(results.every((result) => result.names.length === 1 && result.names[0] === `Producto ${result.label}`)).toBe(true);
  });

  it("leaves no user or role behind on the connection after a query", async () => {
    await runAnalystQueryService(userA.id, "select 1 as one from analyst.products", {}, db);

    const [state] = await db.execute(sql`
      select current_user as role, nullif(current_setting('app.user_id', true), '') as user_id
    `);

    expect(state).toEqual({ role: "postgres", user_id: null });
  });

  // Each attack names the other user, as a model that learned B's id would.
  const attacks: [string, (other: string) => string][] = [
    ["switching the user with set_config", (other) => `select set_config('app.user_id', '${other}', true)`],
    [
      "switching the user inside a subquery",
      (other) => `select * from analyst.products where (select set_config('app.user_id', '${other}', true)) is not null`,
    ],
    ["switching the user with a quoted function name", (other) => `select "SET_CONFIG"('app.user_id', '${other}', true)`],
    ["reading the session user", () => "select current_setting('app.user_id')"],
    ["calling the view function", () => "select analyst.current_user_id()"],
    ["hiding a second statement", (other) => `select 1; select set_config('app.user_id', '${other}', true)`],
    ["leaving the role", () => "reset role"],
    ["becoming postgres", () => "set role postgres"],
    ["reading a real table", () => "select * from public.products"],
    ["reading auth users", () => "select email from auth.users"],
    ["reading the catalog", () => "select * from pg_catalog.pg_roles"],
    ["reading the catalog without schema", () => "select rolname from pg_roles"],
    ["a UNION with a real table", () => "select id from analyst.products union select id from public.products"],
    ["reading the other user's rows by id", (other) => `select * from public.businesses where owner_user_id = '${other}'`],
    ["a function that reads files", () => "select pg_read_file('/etc/passwd')"],
    ["a cast that reaches the catalog", () => "select 'pg_roles'::regclass"],
  ];

  it.each(attacks)("rejects %s", async (_name, build) => {
    const run = runAnalystQueryService(userA.id, build(userB.id), {}, db);

    await expect(run).rejects.toMatchObject({
      code: "ANALYST_QUERY_REJECTED",
      details: { reason: expect.any(String) },
    });
  });

  it("never returns the other user's data to a query that is allowed", async () => {
    const queries = [
      "select * from analyst.products union all select * from analyst.products",
      "select p.name from analyst.products p cross join analyst.supplies s",
      "select name from analyst.products where name like '%B%' or name like '%'",
      "select (select count(*) from analyst.business_expenses) as n",
    ];

    const results = await Promise.all(queries.map((query) => runAnalystQueryService(userA.id, query, {}, db)));

    expect(JSON.stringify(results.map((result) => result.rows))).not.toContain("B");
  });

  // Documents why the validator is mandatory: the role cannot lose set_config,
  // so without the validator one statement could change the session user.
  it("lets set_config switch the user when only the database protects it", async () => {
    const rows = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.user_id', ${userA.id}, true)`);
      await tx.execute(sql`set local role analyst_reader`);
      await tx.execute(sql`select set_config('app.user_id', ${userB.id}, true)`);
      return [...(await tx.execute(sql`select name from analyst.products`))];
    });

    expect(rows).toEqual([{ name: "Producto B" }]);
  });
});

describe("runAnalystQueryService failures", () => {
  it("stops a query that runs longer than the timeout", async () => {
    const heavy = `select count(*) from analyst.business_expenses a, analyst.business_expenses b,
      analyst.business_expenses c, analyst.business_expenses d`;

    const run = runAnalystQueryService(userC.id, heavy, { statementTimeoutMs: 20 }, db);

    await expect(run).rejects.toMatchObject({ code: "ANALYST_QUERY_TIMEOUT" });
  });

  it("keeps working after a timeout", async () => {
    const heavy = `select count(*) from analyst.business_expenses a, analyst.business_expenses b,
      analyst.business_expenses c, analyst.business_expenses d`;
    await runAnalystQueryService(userC.id, heavy, { statementTimeoutMs: 20 }, db).catch(() => undefined);

    const result = await runAnalystQueryService(userA.id, "select name from analyst.products", {}, db);

    expect(result.rows).toEqual([{ name: "Producto A" }]);
  });

  it("tells the model about an unknown column", async () => {
    const run = runAnalystQueryService(userA.id, "select nope from analyst.products", {}, db);

    await expect(run).rejects.toMatchObject({
      code: "ANALYST_QUERY_FAILED",
      details: { reason: expect.stringContaining("nope") },
    });
  });

  it("tells the model about a division by zero", async () => {
    const run = runAnalystQueryService(userA.id, "select 1 / 0 as x from analyst.products", {}, db);

    await expect(run).rejects.toMatchObject({
      code: "ANALYST_QUERY_FAILED",
      details: { reason: expect.stringContaining("division by zero") },
    });
  });

  it("asks for aliases when two columns share a name", async () => {
    const run = runAnalystQueryService(
      userA.id,
      "select * from analyst.products p join analyst.recipe_lines r on r.product_id = p.id",
      {},
      db,
    );

    await expect(run).rejects.toMatchObject({
      code: "ANALYST_QUERY_FAILED",
      details: { reason: expect.stringContaining("alias") },
    });
  });

  it("opens a READ ONLY transaction", async () => {
    let requested: unknown;
    const spy = {
      transaction: async (_run: unknown, config: unknown) => {
        requested = config;
        throw new Error("stop here");
      },
    } as unknown as Db;

    await runAnalystQueryService(userA.id, "select 1 from analyst.products", {}, spy).catch(() => undefined);

    expect(requested).toEqual({ accessMode: "read only" });
  });

  it("lets an infrastructure error go up untouched", async () => {
    const boom = new Error("connection lost");
    const broken = {
      transaction: async () => {
        throw boom;
      },
    } as unknown as Db;

    const run = runAnalystQueryService(userA.id, "select 1 from analyst.products", {}, broken);

    await expect(run).rejects.toBe(boom);
  });
});
