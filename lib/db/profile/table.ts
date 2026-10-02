import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Evaluation spike only: real tables modeled from erd-calculadora-inteligente.mmd.
// Not wired to any database and not imported by domain code (lib/calc,
// lib/money) or any route. Table names are snake_case in Postgres while
// fields stay camelCase in TypeScript, per the official Drizzle docs.
// ---------------------------------------------------------------------------

export const profiles = pgTable("profiles", {
  // PK mirrors auth.users(id); FK added via migration with onDelete: cascade.
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Single source of truth: row types are inferred from the table definitions,
// so there is no hand-written entity interface to keep in sync.
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
