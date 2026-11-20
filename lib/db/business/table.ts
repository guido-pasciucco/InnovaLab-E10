import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "../profile/table";
import { supplies } from "../supplies/table";

// ---------------------------------------------------------------------------
// Server-side persistence (ADR 02): real tables modeled from
// erd-calculadora-inteligente.mmd. Consumed only by lib/services through
// getDrizzleClient(); never imported by domain code (lib/calc, lib/money) or client code.
// Table names are snake_case in Postgres while fields stay camelCase in
// TypeScript, per the official Drizzle docs.
// ---------------------------------------------------------------------------

export const businesses = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  businessType: text("business_type"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  skuOrSlug: text("sku_or_slug"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const productIngredients = pgTable("product_ingredients", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  supplyId: uuid("supply_id")
    .notNull()
    // A supply used by a recipe cannot be deleted: the service returns a clear
    // SUPPLY_IN_USE and this constraint is the last line of defense. Drizzle
    // cannot model DEFERRABLE, so the custom migration
    // 20261112224829_product_ingredients_fk_deferrable.sql adds it: the check
    // waits for commit, letting a profile/business cascade remove the recipe
    // lines and the supply in one transaction (account deletion) while a direct
    // supply DELETE still fails.
    .references(() => supplies.id, { onDelete: "no action" }),
  // Unit chosen for this line. It must belong to the supply's family; the
  // service validates it before writing. Legacy rows may keep a free-text unit
  // when their supply predates the catalog. Nullable only as a two-phase
  // migration step: the service always sends a unit, and a follow-up migration
  // will SET NOT NULL once the new code is live (see W1 of the #266 review).
  unit: text("unit"),
  // Matches the project's quantity columns (numeric(14,4)); recipe quantities
  // keep four decimals so the cost engine can work with exact values.
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  // One row per supply in a recipe: the form rejects duplicates and the
  // database enforces the same rule under concurrency.
  uniqueIndex("product_ingredients_product_supply_uq").on(
    table.productId,
    table.supplyId,
  ),
  // Reverse lookup for the supply-in-use checks (delete / type / unit changes).
  index("product_ingredients_supply_id_idx").on(table.supplyId),
  check("product_ingredients_quantity_positive", sql`${table.quantity} > 0`),
  check("product_ingredients_unit_not_empty", sql`length(btrim(${table.unit})) > 0`),
]);

// Single source of truth: row types are inferred from the table definitions,
// so there is no hand-written entity interface to keep in sync.
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductIngredient = typeof productIngredients.$inferSelect;
export type NewProductIngredient = typeof productIngredients.$inferInsert;
