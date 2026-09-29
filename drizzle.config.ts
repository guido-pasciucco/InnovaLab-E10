import { defineConfig } from "drizzle-kit";

// Drizzle Kit configuration for the evaluation spike.
// Requires DATABASE_URL at runtime for migrate/push; generate only needs the schema.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  migrations: {
    prefix: "supabase",
  },
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
