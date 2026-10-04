import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Server-side persistence (ADR 0005): real tables modeled from
// erd-calculadora-inteligente.mmd. Consumed only by lib/services through
// getDb(); never imported by domain code (lib/calc, lib/money) or client code.
// Table names are snake_case in Postgres while fields stay camelCase in
// TypeScript, per the official Drizzle docs.
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
