import "server-only";

import { sql } from "drizzle-orm";

import { formatAnalystSchema, type AnalystColumnInfo } from "@/lib/analyst/schema-description";
import { ANALYST_SCHEMA } from "@/lib/analyst/views";
import { getDrizzleClient, type Db } from "@/lib/db/client";

type SchemaRow = {
  view_name: string;
  view_comment: string | null;
  column_name: string;
  column_type: string;
  column_comment: string | null;
};

// Reads the views of the `analyst` schema straight from the database, so the
// prompt cannot drift from the migrations: a renamed column or an edited
// comment reaches the model on the next deploy. It runs as the app role, not
// as `analyst_reader`, which cannot read the catalog by design.
async function loadAnalystSchemaDescription(db: Db): Promise<string> {
  const rows = await db.execute<SchemaRow>(sql`
    select c.relname as view_name,
           obj_description(c.oid, 'pg_class') as view_comment,
           a.attname as column_name,
           format_type(a.atttypid, a.atttypmod) as column_type,
           col_description(c.oid, a.attnum) as column_comment
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    where n.nspname = ${ANALYST_SCHEMA} and c.relkind = 'v'
    order by c.relname, a.attnum
  `);

  const columns: AnalystColumnInfo[] = [...rows].map((row) => ({
    view: row.view_name,
    viewComment: row.view_comment,
    column: row.column_name,
    type: row.column_type,
    comment: row.column_comment,
  }));
  return formatAnalystSchema(columns);
}

// The schema only changes with a deploy, which restarts the process, so it is
// read once. A failed read is not kept: the next question tries again.
let cached: Promise<string> | undefined;

export function getAnalystSchemaDescriptionService(db: Db = getDrizzleClient()): Promise<string> {
  cached ??= loadAnalystSchemaDescription(db).catch((err: unknown) => {
    cached = undefined;
    throw err;
  });
  return cached;
}

// For tests that need a fresh read.
export function clearAnalystSchemaCache(): void {
  cached = undefined;
}
