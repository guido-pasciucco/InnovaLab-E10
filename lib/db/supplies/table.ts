import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { profiles } from "../profile/table";

// Server-side persistence: real table modeled from the supply catalog domain.
// Consumed only by lib/services through getDrizzleClient(); never imported by
// domain code (lib/calc, lib/money) or client code.
// Table names are snake_case in Postgres while fields stay camelCase in
// TypeScript, per the official Drizzle docs.
//
// Numeric columns map to `string` in TypeScript (never float), so no rounding
// leaks into the domain. Conversion to the pure domain happens at the
// application boundary (see AGENTS.md).
// ---------------------------------------------------------------------------

export const supplies = pgTable("supplies", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Single source of truth: row types are inferred from the table definitions,
// so there is no hand-written entity interface to keep in sync.
export type Supply = typeof supplies.$inferSelect;
export type NewSupply = typeof supplies.$inferInsert;
