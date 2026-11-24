import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
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
  // How many units the business plans to make in the month (#269). One number
  // per product, independent of the calculation period. NULL means "not
  // loaded" and is stored instead of 0 so the UI can tell empty from zero.
  monthlyCapacity: integer("monthly_capacity"),
  // Historical products can lack this source datum. New product writes require it.
  yieldQuantity: integer("yield_quantity"),
  // Current derived variable costs. These columns are intentionally nullable:
  // legacy products have no fabricated value until a future explicit backfill.
  // Monetary columns are only display values; consumers that calculate further
  // must use the exact numerator/denominator pairs.
  variableCostStatus: text("variable_cost_status").notNull().default("pending"),
  variableCostUnitAmount: numeric("variable_cost_unit_amount", {
    precision: 12,
    scale: 2,
  }),
  variableCostUnitNumerator: text("variable_cost_unit_numerator"),
  variableCostUnitDenominator: text("variable_cost_unit_denominator"),
  variableCostRecipeAmount: numeric("variable_cost_recipe_amount", {
    precision: 12,
    scale: 2,
  }),
  variableCostRecipeNumerator: text("variable_cost_recipe_numerator"),
  variableCostRecipeDenominator: text("variable_cost_recipe_denominator"),
  variableCostUnavailableCode: text("variable_cost_unavailable_code"),
  variableCostCalculatedAt: timestamp("variable_cost_calculated_at", {
    withTimezone: true,
  }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  check("products_monthly_capacity_non_negative", sql`${table.monthlyCapacity} >= 0`),
  // Existing products predate recipe yield, but any present value is positive.
  check(
    "products_yield_quantity_positive",
    sql`${table.yieldQuantity} IS NULL OR ${table.yieldQuantity} > 0`,
  ),
  check(
    "products_variable_cost_status_valid",
    sql`${table.variableCostStatus} IN ('pending', 'ready', 'unavailable')`,
  ),
  check(
    "products_variable_cost_ready_shape",
    sql`(
      ${table.variableCostStatus} = 'ready'
      AND ${table.variableCostUnitAmount} IS NOT NULL
      AND ${table.variableCostUnitNumerator} ~ '^[0-9]+$'
      AND ${table.variableCostUnitDenominator} ~ '^[1-9][0-9]*$'
      AND ${table.variableCostRecipeAmount} IS NOT NULL
      AND ${table.variableCostRecipeNumerator} ~ '^[0-9]+$'
      AND ${table.variableCostRecipeDenominator} ~ '^[1-9][0-9]*$'
      AND ${table.variableCostUnavailableCode} IS NULL
      AND ${table.variableCostCalculatedAt} IS NOT NULL
    ) OR (
      ${table.variableCostStatus} IN ('pending', 'unavailable')
      AND ${table.variableCostUnitAmount} IS NULL
      AND ${table.variableCostUnitNumerator} IS NULL
      AND ${table.variableCostUnitDenominator} IS NULL
      AND ${table.variableCostRecipeAmount} IS NULL
      AND ${table.variableCostRecipeNumerator} IS NULL
      AND ${table.variableCostRecipeDenominator} IS NULL
    )`,
  ),
  check(
    "products_variable_cost_amounts_nonnegative",
    sql`(${table.variableCostUnitAmount} IS NULL OR ${table.variableCostUnitAmount} >= 0)
      AND (${table.variableCostRecipeAmount} IS NULL OR ${table.variableCostRecipeAmount} >= 0)`,
  ),
]);

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

// A commercial presentation is one way of selling a product: a configurable
// number of units plus the packaging used to assemble it. The packaging price
// is never copied here; presentation_packaging references the catalog row, so
// changing a price in `supplies` updates every presentation that uses it.
export const presentations = pgTable("presentations", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // The cost engine requires a positive whole number of units per pack.
  unitsPerPresentation: numeric("units_per_presentation", {
    precision: 14,
    scale: 4,
  }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  check("presentations_units_positive", sql`${table.unitsPerPresentation} > 0`),
  check(
    "presentations_units_integer",
    sql`${table.unitsPerPresentation} = floor(${table.unitsPerPresentation})`,
  ),
  uniqueIndex("presentations_product_name_uq").on(table.productId, table.name),
]);

// One row per packaging item used by a presentation (box + label + tape).
// The FK to `supplies` deliberately uses NO ACTION, mirroring
// `product_ingredients`: a packaging row still referenced by a presentation
// cannot be deleted. Drizzle cannot model DEFERRABLE, so the custom migration
// 20261123222357_presentation_packaging_fk_deferrable.sql adds it: the check
// waits for commit, letting a profile/business cascade remove the presentation
// packaging and the supply in one transaction (account deletion) while a
// direct supply DELETE still fails. The supplies service checks this reference
// first and returns a friendly SUPPLY_IN_USE; this constraint is the last line
// of defense. The unit must belong to the packaging's catalog family; the
// presentations service validates it before writing.
export const presentationPackaging = pgTable("presentation_packaging", {
  id: uuid("id").defaultRandom().primaryKey(),
  presentationId: uuid("presentation_id")
    .notNull()
    .references(() => presentations.id, { onDelete: "cascade" }),
  supplyId: uuid("supply_id")
    .notNull()
    .references(() => supplies.id, { onDelete: "no action" }),
  unit: text("unit").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("presentation_packaging_presentation_supply_uq").on(
    table.presentationId,
    table.supplyId,
  ),
  index("presentation_packaging_supply_id_idx").on(table.supplyId),
  check("presentation_packaging_quantity_positive", sql`${table.quantity} > 0`),
  check("presentation_packaging_unit_not_empty", sql`length(btrim(${table.unit})) > 0`),
]);

// Single source of truth: row types are inferred from the table definitions,
// so there is no hand-written entity interface to keep in sync.
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductIngredient = typeof productIngredients.$inferSelect;
export type NewProductIngredient = typeof productIngredients.$inferInsert;
export type Presentation = typeof presentations.$inferSelect;
export type NewPresentation = typeof presentations.$inferInsert;
export type PresentationPackaging = typeof presentationPackaging.$inferSelect;
export type NewPresentationPackaging = typeof presentationPackaging.$inferInsert;
