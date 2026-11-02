// Applies pending Drizzle migrations to the database in DIRECT_URL.
// Run with `bun --env-file=.env.deploy`. It does not go through drizzle-kit:
// drizzle-kit loads `.env` on its own and can end up migrating a different
// database (e.g. the local one) while still reporting success.
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("DIRECT_URL is missing in .env.deploy");
  process.exit(1);
}

const { host, pathname } = new URL(url);
console.log(`Migrating ${host}${pathname}`);

const MIGRATIONS_FOLDER = "./drizzle";

// The Drizzle migrator only runs migrations newer than the last applied one,
// so a migration generated earlier on a parallel branch can be skipped without
// any error. Compare the journal against the registry to catch that. Matching
// is by `when` (what Drizzle stores as created_at), not by file hash: a SQL
// file edited after being applied changes its hash but is not a skipped one.
function journalEntries(): { tag: string; when: number }[] {
  const journal = JSON.parse(
    readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, "utf8"),
  ) as { entries: { tag: string; when: number }[] };

  return journal.entries;
}

const client = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });

  const applied = new Set(
    (await client`select created_at from drizzle.__drizzle_migrations`).map(
      (row) => Number(row.created_at),
    ),
  );
  const skipped = journalEntries().filter(({ when }) => !applied.has(when));

  if (skipped.length > 0) {
    console.error("Migrations in the journal were NOT applied (skipped):");
    for (const { tag } of skipped) console.error(`  - ${tag}`);
    console.error(
      "Their timestamp is older than the last applied migration. " +
        "Apply them by hand and register them in drizzle.__drizzle_migrations.",
    );
    process.exitCode = 1;
  } else {
    console.log("Migrations applied");
  }
} finally {
  await client.end();
}
