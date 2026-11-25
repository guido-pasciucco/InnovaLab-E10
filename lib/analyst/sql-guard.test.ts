import { describe, expect, it } from "vitest";

import { ANALYST_SQL_MAX_LENGTH, validateAnalystSql } from "./sql-guard";
import { ACCEPTED } from "./sql-guard.fixtures";

const REJECTED: [string, string, string][] = [
  // More than one statement / not a SELECT
  ["two statements", "select 1; select 2", "una sola sentencia"],
  ["a statement hidden after a SELECT", "select 1; drop table analyst.products", "una sola sentencia"],
  ["a comment that hides a second statement", "select 1; /* x */ select 2", "una sola sentencia"],
  ["DROP", "drop table analyst.products", "Solo se permiten consultas SELECT"],
  ["INSERT", "insert into analyst.products (name) values ('x')", "Solo se permiten consultas SELECT"],
  ["UPDATE", "update analyst.products set name = 'x'", "Solo se permiten consultas SELECT"],
  ["DELETE", "delete from analyst.products", "Solo se permiten consultas SELECT"],
  ["TRUNCATE", "truncate analyst.products", "Solo se permiten consultas SELECT"],
  ["CREATE TABLE", "create table t (id int)", "Solo se permiten consultas SELECT"],
  ["SET ROLE", "set role postgres", "Solo se permiten consultas SELECT"],
  ["SET", "set app.user_id = 'x'", "Solo se permiten consultas SELECT"],
  ["RESET", "reset role", "Solo se permiten consultas SELECT"],
  ["SHOW", "show all", "Solo se permiten consultas SELECT"],
  ["COPY", "copy analyst.products to program 'ls'", "Solo se permiten consultas SELECT"],
  ["EXPLAIN", "explain select 1", "Solo se permiten consultas SELECT"],
  ["DO", "do $$ begin perform 1; end $$", "Solo se permiten consultas SELECT"],
  ["CALL", "call pg_sleep(1)", "Solo se permiten consultas SELECT"],
  ["a writable CTE", "with x as (delete from analyst.products returning *) select * from x", "DeleteStmt"],
  ["SELECT INTO", "select * into leak from analyst.products", "INTO"],
  ["FOR UPDATE", "select * from analyst.products for update", "FOR UPDATE"],
  ["WITH RECURSIVE", "with recursive r as (select 1 as n union all select n + 1 from r) select * from r", "RECURSIVE"],

  // Functions
  ["set_config", "select set_config('app.user_id', '00000000-0000-0000-0000-000000000000', true)", "set_config"],
  ["set_config in a subquery", "select * from analyst.products where (select set_config('app.user_id', 'x', true)) = 'x'", "set_config"],
  ["set_config with a quoted name", `select "SET_CONFIG"('app.user_id', 'x', true)`, "SET_CONFIG"],
  ["set_config with its schema", "select pg_catalog.set_config('app.user_id', 'x', true)", "set_config"],
  ["current_setting", "select current_setting('app.user_id')", "current_setting"],
  ["current_user_id of the views", "select analyst.current_user_id()", "current_user_id"],
  ["pg_sleep", "select pg_sleep(10)", "pg_sleep"],
  ["pg_read_file", "select pg_read_file('/etc/passwd')", "pg_read_file"],
  ["version", "select version()", "version"],
  ["a function in FROM", "select * from generate_series(1, 100000000)", "RangeFunction"],
  ["dblink", "select * from dblink('host=x', 'select 1') as t(a int)", "RangeFunction"],
  ["an extension function", "select crypt('a', gen_salt('bf'))", "crypt"],

  // Relations
  ["a catalog view", "select * from pg_roles", "pg_roles"],
  ["a catalog table with schema", "select * from pg_catalog.pg_roles", "analyst"],
  ["information_schema", "select * from information_schema.tables", "analyst"],
  ["a table of public", "select * from public.products", "analyst"],
  ["a table of auth", "select * from auth.users", "analyst"],
  ["the extension statistics view", "select * from extensions.pg_stat_statements", "analyst"],
  ["an unknown view of analyst", "select * from analyst.profiles", "no existe"],
  ["an unknown name without schema", "select * from profiles", "profiles"],
  ["a catalog next to a valid view", "select * from analyst.products, pg_class", "pg_class"],
  ["a database-qualified name", "select * from postgres.analyst.products", "base de datos"],
  [
    "a CTE name used outside its scope",
    "select * from (with pg_roles as (select 1 as n) select n from pg_roles) a, pg_roles",
    "pg_roles",
  ],
  ["a CTE referenced before it is defined", "with a as (select * from b), b as (select 1) select * from a", "La relación b"],

  // Types, values, operators
  ["a regclass cast", "select 'pg_roles'::regclass", "regclass"],
  ["a regproc cast", "select 'pg_sleep'::regproc", "regproc"],
  ["a cast to an array", "select '{1}'::int[]", "arreglos"],
  ["an array constructor", "select array[1, 2]", "A_ArrayExpr"],
  ["a parameter", "select $1", "ParamRef"],
  ["CURRENT_USER", "select current_user", "CURRENT_DATE"],
  ["SESSION_USER", "select session_user", "CURRENT_DATE"],
  ["CURRENT_SCHEMA", "select current_schema", "CURRENT_DATE"],
  ["a qualified operator", "select 'a' operator(pg_catalog.||) 'b'", "operador"],
  ["a JSON operator", `select '{"a":1}'::jsonb ->> 'a'`, "->>"],
  ["a row constructor", "select row(1, 2)", "RowExpr"],

  // Text problems
  ["a syntax error", "selec 1", "SQL inválido"],
  ["an empty query", "", "vacía"],
  ["only spaces", "   \n  ", "vacía"],
  ["only a comment", "-- nada", "vacía"],
];

describe("validateAnalystSql", () => {
  it.each(ACCEPTED)("accepts %s", async (_name, sql) => {
    const result = await validateAnalystSql(sql);

    expect(result).toEqual({ ok: true, sql: expect.any(String) });
  });

  it.each(REJECTED)("rejects %s", async (_name, sql, reason) => {
    const result = await validateAnalystSql(sql);

    expect(result.ok).toBe(false);
    expect(result).toEqual({ ok: false, reason: expect.stringContaining(reason) });
  });

  it("rejects a query longer than the limit", async () => {
    const sql = `select '${"a".repeat(ANALYST_SQL_MAX_LENGTH)}'`;

    const result = await validateAnalystSql(sql);

    expect(result).toEqual({ ok: false, reason: expect.stringContaining("demasiado larga") });
  });

  it("returns the statement without the trailing semicolon", async () => {
    const result = await validateAnalystSql("  select count(*) from analyst.products ;  ");

    expect(result).toEqual({ ok: true, sql: "select count(*) from analyst.products" });
  });

  it("keeps accents and ñ intact when the text has multibyte characters", async () => {
    const result = await validateAnalystSql("select 'Café ñandú' as nombre, name from analyst.products;");

    expect(result).toEqual({ ok: true, sql: "select 'Café ñandú' as nombre, name from analyst.products" });
  });

  it("lists the available views when the relation is unknown", async () => {
    const result = await validateAnalystSql("select * from usuarios");

    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining("analyst.recipe_lines"),
    });
  });
});
