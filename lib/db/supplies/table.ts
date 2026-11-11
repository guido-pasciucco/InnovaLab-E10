import { sql } from "drizzle-orm";
import { check, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { profiles } from "../profile/table";
import type { SupplyKind } from "@/lib/schemas/supplies/fields";

// Server-side persistence: real table modeled from the supply catalog domain.
// Consumed only by lib/services through getDrizzleClient(); never imported by
// domain code (lib/calc, lib/money) or client code.
// Table names are snake_case in Postgres while fields stay camelCase in
// TypeScript, per the official Drizzle docs.
//
// Numeric columns map to `string` in TypeScript (never float), so no rounding
// leaks into the domain. Conversion to the pure domain happens at the
// application boundary (see AGENTS.md).
//
// `kind` separates insumos from packaging without a second table: both are
// supplies and share the same form, the difference is presentational.
// `purchase_quantity` × `conversion_factor` is the purchase expressed in
// `minimum_unit` (e.g. 25 kg × 1000 = 25.000 g); the cost per minimum unit is
// purchase_price / that product (lib/calc/supplyCost.ts).
// ---------------------------------------------------------------------------

export const supplies = pgTable("supplies", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  kind: text("kind").$type<SupplyKind>().notNull().default("supply"),
  name: text("name").notNull(),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull(),
  purchaseQuantity: numeric("purchase_quantity", { precision: 14, scale: 4 })
    .notNull()
    .default("1"),
  purchaseUnit: text("purchase_unit").notNull().default("unidad"),
  minimumUnit: text("minimum_unit").notNull().default("unidad"),
  conversionFactor: numeric("conversion_factor", { precision: 14, scale: 4 })
    .notNull()
    .default("1"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  // Second net for the field rules: the engine divides by both values.
  check("supplies_purchase_quantity_positive", sql`${table.purchaseQuantity} > 0`),
  check("supplies_conversion_factor_positive", sql`${table.conversionFactor} > 0`),
  check("supplies_kind_valid", sql`${table.kind} in ('supply', 'packaging')`),
]);

// Single source of truth: row types are inferred from the table definitions,
// so there is no hand-written entity interface to keep in sync.
export type Supply = typeof supplies.$inferSelect;
export type NewSupply = typeof supplies.$inferInsert;
