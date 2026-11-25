import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { assertLocalUrl } from "../../tests/support/test-env";
import { migrateDatabase } from "./migrate-database";

const exec = promisify(execFile);
const adminUrl = process.env.MIGRATION_TEST_DATABASE_URL
  ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
assertLocalUrl("MIGRATION_TEST_DATABASE_URL", adminUrl);
const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
const root = join(process.cwd(), "drizzle");
const journal = JSON.parse(readFileSync(join(root, "meta/_journal.json"), "utf8")) as {
  entries: { idx: number; tag: string; when: number }[];
};
// Later migrations append after this repair. Drizzle will not run it once a newer one is applied.
const repairEntry = journal.entries.find((e) => e.tag === "20261124153914_reconcile_help_usage");
if (repairEntry === undefined) throw new Error("Journal is missing 20261124153914_reconcile_help_usage");
const repair = repairEntry;
const mora = journal.entries.filter((e) => e.when === 1795287505824 || e.when === 1795287593887);
const main = journal.entries.filter((e) => !mora.includes(e) && e.when < repair.when);
const created: { name: string; client: postgres.Sql; folder: string }[] = [];
const userId = "a251a2fd-6c13-4c42-bb5c-7842a3398242";
const leaseId = "a251a2fd-6c13-4c42-bb5c-7842a3398243";

async function database() {
  const name = `pr259_${randomUUID().replaceAll("-", "")}`;
  const folder = mkdtempSync(join(tmpdir(), "pr259-migrations-"));
  await admin`create database ${admin(name)}`;
  await admin`alter database ${admin(name)} set search_path to public, extensions`;
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const client = postgres(url.toString(), {
    max: 1, onnotice: () => {}, connection: { search_path: "public,extensions" },
  });
  created.push({ name, client, folder });
  // Real PostgreSQL, isolated DB. Only Supabase's Auth boundary is bootstrapped;
  // ALL application DDL is applied by the installed Drizzle migrator.
  await client.unsafe(`
    CREATE SCHEMA auth;
    CREATE SCHEMA extensions;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE public.pr259_sentinel (id integer PRIMARY KEY, value text NOT NULL);
    INSERT INTO public.pr259_sentinel VALUES (1, 'keep-existing-data');
  `);
  return { client, url: url.toString(), folder };
}

async function apply(url: string, folder: string, entries: typeof journal.entries) {
  mkdirSync(join(folder, "meta"), { recursive: true });
  writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify({ ...journal, entries }));
  for (const e of entries) copyFileSync(join(root, `${e.tag}.sql`), join(folder, `${e.tag}.sql`));
  await migrateDatabase(url, folder);
}

async function seed(client: postgres.Sql, withHelp: boolean) {
  await client`insert into auth.users (id) values (${userId})`;
  await client`insert into public.businesses (owner_user_id, name) values (${userId}, 'PR259 existing business')`;
  if (withHelp) {
    await client`insert into public.help_usage
      (user_id, window_started_at, request_count, active_lease_id, active_until)
      values (${userId}, '2026-11-21T18:00:00Z', 7, ${leaseId}, '2026-11-21T18:01:00Z')`;
  }
}

async function registry(client: postgres.Sql) {
  return client`select id, hash, created_at::text from drizzle.__drizzle_migrations order by id`;
}

async function verify(client: postgres.Sql, url: string, hadHelp: boolean) {
  const columns = await client`select column_name, udt_name, is_nullable, column_default
    from information_schema.columns where table_schema = 'public' and table_name = 'help_usage'
    order by ordinal_position`;
  expect(columns.map((c) => [c.column_name, c.udt_name, c.is_nullable, c.column_default])).toEqual([
    ["user_id", "uuid", "NO", null], ["window_started_at", "timestamptz", "NO", null],
    ["request_count", "int4", "NO", "0"], ["active_lease_id", "uuid", "YES", null],
    ["active_until", "timestamptz", "YES", null],
  ]);
  const constraints = await client`select contype, pg_get_constraintdef(oid) as definition, convalidated
    from pg_constraint where conrelid = 'public.help_usage'::regclass order by contype`;
  expect(constraints.map((c) => [c.contype, c.definition, c.convalidated])).toEqual([
    ["f", "FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE", true],
    ["p", "PRIMARY KEY (user_id)", true],
  ]);
  expect((await client`select relrowsecurity from pg_class where oid = 'public.help_usage'::regclass`)[0].relrowsecurity).toBe(true);
  for (const role of ["anon", "authenticated"]) {
    const [p] = await client`select
      has_table_privilege(${role}, 'public.help_usage', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as table_grant,
      has_any_column_privilege(${role}, 'public.help_usage', 'SELECT,INSERT,UPDATE,REFERENCES') as column_grant`;
    expect(p).toEqual({ table_grant: false, column_grant: false });
    await expect(client.begin(async (tx) => {
      await tx.unsafe(`set local role ${role}`);
      await tx`select * from public.help_usage`;
    })).rejects.toMatchObject({ code: "42501" });
  }
  const rows = await registry(client);
  expect(rows).toHaveLength(journal.entries.length);
  expect(new Set(rows.map((r) => Number(r.created_at)))).toEqual(new Set(journal.entries.map((e) => e.when)));
  for (const e of mora) expect(rows.filter((r) => Number(r.created_at) === e.when)).toHaveLength(1);
  for (const entry of journal.entries) {
    const sql = readFileSync(join(root, `${entry.tag}.sql`), "utf8");
    const variants = mora.includes(entry)
      ? [sql.replaceAll("\r\n", "\n"), sql.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n")]
      : [sql];
    expect(variants.map((s) => createHash("sha256").update(s).digest("hex")))
      .toContain(rows.find((r) => Number(r.created_at) === entry.when)!.hash);
  }
  expect((await client`select value from public.pr259_sentinel where id = 1`)[0].value).toBe("keep-existing-data");
  expect((await client`select name from public.businesses where owner_user_id = ${userId}`)[0].name).toBe("PR259 existing business");
  expect((await client`select to_regclass('public.calculations') as legacy`)[0].legacy).toBeNull();
  if (hadHelp) {
    const [row] = await client`select * from public.help_usage where user_id = ${userId}`;
    expect(row.request_count).toBe(7);
    expect(row.active_lease_id).toBe(leaseId);
    expect(row.window_started_at.toISOString()).toBe("2026-11-21T18:00:00.000Z");
    expect(row.active_until.toISOString()).toBe("2026-11-21T18:01:00.000Z");
  } else {
    await client`insert into public.help_usage (user_id, window_started_at) values (${userId}, now())`;
    expect((await client`select request_count from public.help_usage where user_id = ${userId}`)[0].request_count).toBe(0);
  }
  const before = await registry(client);
  await migrateDatabase(url, root);
  expect(await registry(client)).toEqual(before);
  // Exercise the corrective SQL itself a second time, rather than just Drizzle's skip.
  await client.begin((tx) => tx.unsafe(readFileSync(join(root, `${repair.tag}.sql`), "utf8")));
  expect(await registry(client)).toEqual(before);
  await expect(client`insert into public.help_usage (user_id, window_started_at)
    values ('ffffffff-ffff-ffff-ffff-ffffffffffff', now())`).rejects.toMatchObject({ code: "23503" });
  await client`delete from auth.users where id = ${userId}`;
  expect(await client`select * from public.help_usage where user_id = ${userId}`).toHaveLength(0);
}

afterAll(async () => {
  const results = await Promise.allSettled(created.map(async ({ name, client, folder }) => {
    await client.end();
    // Only names generated above, never an environment-provided database name.
    if (!/^pr259_[a-f0-9]{32}$/.test(name)) throw new Error("Unsafe cleanup name");
    await admin`drop database ${admin(name)} with (force)`;
    rmSync(folder, { recursive: true });
  }));
  await admin.end();
  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length) throw new AggregateError(failures.map((r) => r.reason), "Migration test cleanup failed");
});

describe("Mora forward migration on local PostgreSQL", () => {
  it("applies the complete journal to a new database and preserves data on repeat", async () => {
    const { client, url } = await database();
    await migrateDatabase(url, root);
    await seed(client, false);
    await verify(client, url, false);
  });

  it("repairs main without Mora, including registry entries and the deploy checker", async () => {
    const { client, folder, url } = await database();
    await apply(url, folder, main);
    await seed(client, false);
    const old = await registry(client);
    const result = await exec("bun", ["scripts/deploy/migrate.ts"], {
      env: { ...process.env, DIRECT_URL: url },
    });
    expect(result.stdout).toContain("Migrations applied");
    expect((await registry(client)).slice(0, old.length)).toEqual(old);
    await verify(client, url, false);
  });

  it("preserves Mora applied before main, with existing usage and lease data", async () => {
    const { client, folder, url } = await database();
    await apply(url, folder, journal.entries.filter((e) => e.when <= mora[1].when));
    await seed(client, true);
    const old = await registry(client);
    await migrateDatabase(url, root);
    expect((await registry(client)).slice(0, old.length)).toEqual(old);
    await verify(client, url, true);
  });

  it("repairs a partially applied history and revokes table, PUBLIC and column grants", async () => {
    const { client, folder, url } = await database();
    await apply(url, folder, journal.entries.filter((e) => e !== mora[1] && e.when < repair.when));
    await seed(client, true);
    await client.unsafe(`GRANT SELECT ON public.help_usage TO PUBLIC, anon;
      GRANT UPDATE (request_count) ON public.help_usage TO authenticated;`);
    await migrateDatabase(url, root);
    await verify(client, url, true);
  });

  it("finishes Mora's first migration when security and recent main have not run", async () => {
    const { client, folder, url } = await database();
    await apply(url, folder, journal.entries.filter((e) => e.when <= mora[0].when));
    await seed(client, true);
    await migrateDatabase(url, root);
    await verify(client, url, true);
  });

  it("applies remaining main migrations and repairs Mora after only knowledge was applied", async () => {
    const { client, folder, url } = await database();
    await apply(url, folder, main.filter((e) => e.when <= 1795371767578));
    await seed(client, false);
    await migrateDatabase(url, root);
    await verify(client, url, false);
  });

  it("serializes simultaneous migrators on a new database without duplicate DDL or registry rows", async () => {
    const { client, url } = await database();
    await Promise.all([migrateDatabase(url, root), migrateDatabase(url, root)]);
    await seed(client, false);
    await verify(client, url, false);
  });

  it("fails without migrating if the connection waiting for the session lock is terminated", async () => {
    const { client, url } = await database();
    await client`select pg_advisory_lock(259, 20261124)`;
    const outcome = migrateDatabase(url, root).then(() => null, (error: unknown) => error);
    try {
      let pid: number | undefined;
      for (let attempt = 0; attempt < 100 && pid === undefined; attempt++) {
        const waiting = await admin`select pid from pg_stat_activity
          where datname = ${new URL(url).pathname.slice(1)} and wait_event = 'advisory'`;
        pid = waiting[0]?.pid;
        if (pid === undefined) await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(pid).toBeDefined();
      await admin`select pg_terminate_backend(${pid!})`;
      expect(await outcome).toBeInstanceOf(Error);
      expect((await client`select to_regclass('drizzle.__drizzle_migrations') as registry`)[0].registry).toBeNull();
      expect((await client`select value from public.pr259_sentinel where id = 1`)[0].value).toBe("keep-existing-data");
    } finally {
      await client`select pg_advisory_unlock(259, 20261124)`;
      await outcome;
    }
  });

  for (const damage of ["column", "orphan", "foreign-key", "policy", "hash", "duplicate-history"] as const) {
    it(`fails safely and rolls back for unexpected state: ${damage}`, async () => {
      const { client, folder, url } = await database();
      await apply(url, folder, main);
      await client.unsafe(readFileSync(join(root, `${mora[0].tag}.sql`), "utf8"));
      await seed(client, true);
      if (damage === "column") await client`alter table public.help_usage alter column request_count type bigint`;
      if (damage === "orphan") await client`insert into public.help_usage (user_id, window_started_at)
        values ('ffffffff-ffff-ffff-ffff-ffffffffffff', now())`;
      if (damage === "foreign-key") await client.unsafe(`ALTER TABLE public.help_usage
        ADD CONSTRAINT help_usage_user_id_auth_users_id_fk FOREIGN KEY (user_id) REFERENCES auth.users(id)`);
      if (damage === "policy") await client.unsafe(`CREATE POLICY unexpected ON public.help_usage FOR SELECT TO anon USING (true)`);
      if (damage === "hash" || damage === "duplicate-history") {
        await client`insert into drizzle.__drizzle_migrations (hash, created_at)
          values ('unexpected-hash', ${mora[0].when})`;
        if (damage === "duplicate-history") await client`insert into drizzle.__drizzle_migrations (hash, created_at)
          values ('another-hash', ${mora[0].when})`;
      }
      const before = await registry(client);
      const data = await client`select * from public.help_usage order by user_id`;
      const constraints = await client`select conname, pg_get_constraintdef(oid) as definition
        from pg_constraint where conrelid = 'public.help_usage'::regclass order by conname`;
      await expect(migrateDatabase(url, root)).rejects.toThrow();
      expect(await registry(client)).toEqual(before);
      expect(await client`select * from public.help_usage order by user_id`).toEqual(data);
      expect(await client`select conname, pg_get_constraintdef(oid) as definition
        from pg_constraint where conrelid = 'public.help_usage'::regclass order by conname`).toEqual(constraints);
      expect((await client`select relrowsecurity from pg_class where oid = 'public.help_usage'::regclass`)[0].relrowsecurity).toBe(false);
    });
  }

  it("keeps the deploy check for unrelated omitted migrations", async () => {
    const { client, url } = await database();
    await migrateDatabase(url, root);
    await client`delete from drizzle.__drizzle_migrations where created_at = ${main[0].when}`;
    await expect(exec("bun", ["scripts/deploy/migrate.ts"], {
      env: { ...process.env, DIRECT_URL: url },
    })).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining(main[0].tag) });
  });
});
