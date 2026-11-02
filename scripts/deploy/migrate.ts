// Applies pending Drizzle migrations to the database in DIRECT_URL.
// Run with `bun --env-file=.env.deploy`. It does not go through drizzle-kit:
// drizzle-kit loads `.env` on its own and can end up migrating a different
// database (e.g. the local one) while still reporting success.
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

const client = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied");
} finally {
  await client.end();
}
