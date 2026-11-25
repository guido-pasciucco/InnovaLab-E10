import "server-only";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { validateAnalystSql } from "@/lib/analyst/sql-guard";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";
import type { VerifiedUserId } from "@/lib/services/auth";

// Rows the model gets back. Totals and averages are computed by the database
// over every row; this only trims long listings, and `truncated` tells the
// model it did not see them all.
export const ANALYST_MAX_ROWS = 30;
export const ANALYST_STATEMENT_TIMEOUT_MS = 3_000;

const optionsSchema = z.object({
  maxRows: z.int().min(1).max(1_000).default(ANALYST_MAX_ROWS),
  statementTimeoutMs: z.int().min(10).max(30_000).default(ANALYST_STATEMENT_TIMEOUT_MS),
});

export type AnalystQueryOptions = z.input<typeof optionsSchema>;

export type AnalystQueryResult = {
  // The statement that ran, as the validator returned it (for the server log).
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
  durationMs: number;
};

const QUERY_CANCELED = "57014"; // statement_timeout fired

// Runs the SQL the model wrote against the `analyst` views, for one user.
//
// Layers, outermost first: the validator (single SELECT, allowed relations and
// functions only), a READ ONLY transaction, the role `analyst_reader` (can read
// only the views), the views themselves (they return only `app.user_id`'s rows)
// and a statement timeout. Everything is SET LOCAL / transaction scoped, so it
// is gone when the transaction ends and works through the transaction pooler.
//
// The validator is the only layer that stops `set_config('app.user_id', ...)`:
// the database cannot revoke that function from one role. See the README.
//
// @throws AppError ANALYST_QUERY_REJECTED (`details.reason`) when the validator
//   refuses the SQL; ANALYST_QUERY_FAILED (`details.reason`) when Postgres
//   rejects it (unknown column, division by zero); ANALYST_QUERY_TIMEOUT.
export async function runAnalystQueryService(
  userId: VerifiedUserId,
  query: string,
  opts: AnalystQueryOptions = {},
  db: Db = getDrizzleClient(),
): Promise<AnalystQueryResult> {
  const { maxRows, statementTimeoutMs } = optionsSchema.parse(opts);

  const validation = await validateAnalystSql(query);
  if (!validation.ok) {
    throw new AppError("ANALYST_QUERY_REJECTED", { reason: validation.reason });
  }

  const started = performance.now();
  let result;
  try {
    result = await db.transaction(
      async (tx) => {
        // The role is switched last: these settings are written as `postgres`.
        await tx.execute(sql`
          select set_config('app.user_id', ${userId}, true),
                 set_config('statement_timeout', ${String(statementTimeoutMs)}, true),
                 set_config('search_path', 'analyst', true)
        `);
        await tx.execute(sql`set local role analyst_reader`);
        // The newline keeps a trailing `--` comment from swallowing the
        // parenthesis. One extra row tells us whether the list was cut.
        return tx.execute(
          sql.raw(`select * from (\n${validation.sql}\n) as analyst_query limit ${maxRows + 1}`),
        );
      },
      { accessMode: "read only" },
    );
  } catch (err) {
    const pgError = postgresError(err);
    if (pgError?.code === QUERY_CANCELED) throw new AppError("ANALYST_QUERY_TIMEOUT", undefined, { cause: err });
    // Classes 42 (syntax, unknown column or function) and 22 (bad data, such as
    // division by zero) are mistakes in the query the model can correct.
    // Anything else is infrastructure: it keeps going up to be logged.
    if (pgError && /^(42|22)/.test(pgError.code)) {
      throw new AppError("ANALYST_QUERY_FAILED", { reason: pgError.message }, { cause: err });
    }
    throw err;
  }

  const columns = result.columns.map((column) => column.name);
  const repeated = columns.filter((name, index) => columns.indexOf(name) !== index);
  if (repeated.length > 0) {
    throw new AppError("ANALYST_QUERY_FAILED", {
      reason: `Hay columnas con el mismo nombre (${[...new Set(repeated)].join(", ")}). Elegí las columnas y ponles alias con AS.`,
    });
  }

  return {
    sql: validation.sql,
    columns,
    // The driver already returns text for dates, numerics and bigints, so the
    // rows are JSON safe as they come (the integration test pins it).
    rows: [...result].slice(0, maxRows),
    truncated: result.length > maxRows,
    durationMs: Math.round(performance.now() - started),
  };
}

// Postgres error, unwrapped from Drizzle's query error.
function postgresError(err: unknown): { code: string; message: string } | null {
  const candidates = [err, (err as { cause?: unknown } | null)?.cause];
  for (const candidate of candidates) {
    const pgError = candidate as { code?: unknown; message?: unknown } | null;
    if (typeof pgError?.code === "string" && /^[0-9A-Z]{5}$/.test(pgError.code) && typeof pgError.message === "string") {
      return { code: pgError.code, message: pgError.message };
    }
  }
  return null;
}