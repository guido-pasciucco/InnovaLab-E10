import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { calculations } from "../calculation/table";

// ---------------------------------------------------------------------------
// Purchases for one calculation: what the user bought, in the unit of that
// purchase, and the price paid for the whole quantity. Harina, 25, kg, 20000
// means 25 kg cost 20000 in total — not a price per kilo and not the cost of
// one unit sold. costing_setup.unit is the unit the product is sold in.
//
// This row is not a calc_cost_lines element. behavior, traceability, scenario
// and the business catalog are written later, when a recipe turns the purchase
// into a cost line. No unique index on name: two purchases may share a name.
//
// Numeric columns map to `string` in TypeScript (never float). Money uses
// numeric(12,2); quantities use numeric(14,4).
// ---------------------------------------------------------------------------

export const calcSupplyPurchases = pgTable("calc_supply_purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  calculationId: uuid("calculation_id")
    .notNull()
    .references(() => calculations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  unit: text("unit").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type CalcSupplyPurchase = typeof calcSupplyPurchases.$inferSelect;
export type NewCalcSupplyPurchase = typeof calcSupplyPurchases.$inferInsert;
