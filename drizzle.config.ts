import { defineConfig } from "drizzle-kit";

// Drizzle Kit configuration for the server-side persistence (ADR 02).
// Requires DIRECT_URL at runtime for migrate/push; generate only needs the schema.
// Migrations use the direct (or session pooler, port 5432) connection, never
// the transaction pooler in DATABASE_URL (port 6543): it can hand each
// statement a different backend connection, which breaks prepared statements
// and session state that a multi-step migration relies on.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/*/table.ts",
  out: "./drizzle",
  migrations: {
    prefix: "supabase",
  },
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
});
