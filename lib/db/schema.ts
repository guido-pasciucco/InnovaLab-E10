import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Evaluation spike only: real tables modeled from erd-calculadora-inteligente.mmd.
// Not wired to any database and not imported by domain code (lib/calc,
// lib/money) or any route. Table names are snake_case in Postgres while
// fields stay camelCase in TypeScript, per the official Drizzle docs.
//
// Numeric columns map to `string` in TypeScript (never float), so no rounding
// leaks into the domain. Conversion to the pure domain happens at the
// application boundary (see README-spike.md).
//
// Money-like columns use numeric(12,2); quantities, rates and percentages use
// numeric(14,4) for extra fractional precision.
// ---------------------------------------------------------------------------

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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

export const businessCostLines = pgTable("business_cost_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  concept: text("concept").notNull(),
  behavior: text("behavior").notNull(),
  traceability: text("traceability").notNull(),
  amountPeriod: numeric("amount_period", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const calculations = pgTable("calculations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("draft"),
  schemaVersion: integer("schema_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// 1:1 child of calculations: the PK is also the FK.
export const costingSetup = pgTable("costing_setup", {
  calculationId: uuid("calculation_id")
    .primaryKey()
    .references(() => calculations.id, { onDelete: "cascade" }),
  currency: text("currency").notNull(),
  costingPeriod: text("costing_period").notNull(),
  costingUnit: text("costing_unit").notNull(),
  estimatedVolume: numeric("estimated_volume", {
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
});

// 1:1 child of calculations: the PK is also the FK.
export const pricingInputs = pgTable("pricing_inputs", {
  calculationId: uuid("calculation_id")
    .primaryKey()
    .references(() => calculations.id, { onDelete: "cascade" }),
  marginConvention: text("margin_convention").notNull(),
  expectedMarginPct: numeric("expected_margin_pct", {
    precision: 14,
    scale: 4,
  }).notNull(),
  manualPrice: numeric("manual_price", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const scenarios = pgTable("scenarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  calculationId: uuid("calculation_id")
    .notNull()
    .references(() => calculations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isBase: boolean("is_base").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const calcCostLines = pgTable("calc_cost_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  calculationId: uuid("calculation_id")
    .notNull()
    .references(() => calculations.id, { onDelete: "cascade" }),
  // Nullable: lines can exist at calculation level, outside any scenario.
  scenarioId: uuid("scenario_id").references(() => scenarios.id, {
    onDelete: "cascade",
  }),
  sourceBusinessCostId: uuid("source_business_cost_id")
    .notNull()
    .references(() => businessCostLines.id, { onDelete: "cascade" }),
  concept: text("concept").notNull(),
  behavior: text("behavior").notNull(),
  traceability: text("traceability").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  hours: numeric("hours", { precision: 14, scale: 4 }),
  hourlyRate: numeric("hourly_rate", { precision: 14, scale: 4 }),
  allocationPct: numeric("allocation_pct", { precision: 14, scale: 4 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const computedResults = pgTable("computed_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  calculationId: uuid("calculation_id")
    .notNull()
    .references(() => calculations.id, { onDelete: "cascade" }),
  // Nullable: a result row can cover the whole calculation, not one scenario.
  scenarioId: uuid("scenario_id").references(() => scenarios.id, {
    onDelete: "cascade",
  }),
  totalFixed: numeric("total_fixed", { precision: 12, scale: 2 }).notNull(),
  variableUnit: numeric("variable_unit", { precision: 12, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  contributionMarginUnit: numeric("contribution_margin_unit", {
    precision: 12,
    scale: 2,
  }).notNull(),
  breakEvenUnits: numeric("break_even_units", {
    precision: 14,
    scale: 4,
  }).notNull(),
  breakEvenSales: numeric("break_even_sales", {
    precision: 12,
    scale: 2,
  }).notNull(),
  // No default: set by the server when the computation finishes. Nullable so
  // a pending result row can be inserted before the computation runs.
  computedAt: timestamp("computed_at", { withTimezone: true }),
  resultsPayload: jsonb("results_payload").$type<Record<
    string,
    unknown
  > | null>(),
});

// Single source of truth: row types are inferred from the table definitions,
// so there is no hand-written entity interface to keep in sync.
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type BusinessCostLine = typeof businessCostLines.$inferSelect;
export type NewBusinessCostLine = typeof businessCostLines.$inferInsert;
export type Calculation = typeof calculations.$inferSelect;
export type NewCalculation = typeof calculations.$inferInsert;
export type CostingSetup = typeof costingSetup.$inferSelect;
export type NewCostingSetup = typeof costingSetup.$inferInsert;
export type PricingInputs = typeof pricingInputs.$inferSelect;
export type NewPricingInputs = typeof pricingInputs.$inferInsert;
export type Scenario = typeof scenarios.$inferSelect;
export type NewScenario = typeof scenarios.$inferInsert;
export type CalcCostLine = typeof calcCostLines.$inferSelect;
export type NewCalcCostLine = typeof calcCostLines.$inferInsert;
export type ComputedResult = typeof computedResults.$inferSelect;
export type NewComputedResult = typeof computedResults.$inferInsert;
