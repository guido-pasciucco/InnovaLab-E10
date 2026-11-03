import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { businesses } from "../business/table";
import { calculations, scenarios } from "../calculation/table";

// ---------------------------------------------------------------------------
// Server-side persistence (ADR 02): real tables modeled from
// erd-calculadora-inteligente.mmd. Consumed only by lib/services through
// getDrizzleClient(); never imported by domain code (lib/calc, lib/money) or client code.
// Table names are snake_case in Postgres while fields stay camelCase in
// TypeScript, per the official Drizzle docs.
//
// Numeric columns map to `string` in TypeScript (never float), so no rounding
// leaks into the domain. Conversion to the pure domain happens at the
// application boundary (see AGENTS.md).
//
// Money-like columns use numeric(12,2); quantities, rates and percentages use
// numeric(14,4) for extra fractional precision.
// ---------------------------------------------------------------------------

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

export const calcCostLines = pgTable(
  "calc_cost_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    calculationId: uuid("calculation_id")
      .notNull()
      .references(() => calculations.id, { onDelete: "cascade" }),
    // Nullable: lines can exist at calculation level, outside any scenario.
    scenarioId: uuid("scenario_id").references(() => scenarios.id, {
      onDelete: "cascade",
    }),
    // Nullable: a wizard line (paso 2) is not copied from the business catalog.
    // Deleting the catalog row clears the link and keeps the snapshot (#176, #180).
    sourceBusinessCostId: uuid("source_business_cost_id").references(
      () => businessCostLines.id,
      { onDelete: "set null" },
    ),
    concept: text("concept").notNull(),
    behavior: text("behavior").notNull(),
    traceability: text("traceability").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    hours: numeric("hours", { precision: 14, scale: 4 }),
    hourlyRate: numeric("hourly_rate", { precision: 14, scale: 4 }),
    allocationPct: numeric("allocation_pct", { precision: 14, scale: 4 }),
    // Product units one purchase of a variable line yields (paso 3): the engine
    // takes amount / yield as the per-unit cost. Fixed lines ignore it. The
    // > 0 rule and its message live in yieldField (lib/schemas/costs/fields.ts).
    yieldQuantity: numeric("yield_quantity", { precision: 14, scale: 4 })
      .notNull()
      .default("1"),
    // Cross-cut flag for the paso 4 "Trabajo propio" line. It does not change the
    // totals: the line already counts through its behavior.
    isOwnLabor: boolean("is_own_labor").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // At most one own-labor line per calculation: the paso 4 save is an
    // atomic upsert on this index, so two tabs cannot create two lines.
    uniqueIndex("calc_cost_lines_own_labor_uq")
      .on(table.calculationId)
      .where(sql`${table.isOwnLabor}`),
    // Second net for yieldField: the engine divides by the yield.
    check("calc_cost_lines_yield_quantity_positive", sql`${table.yieldQuantity} > 0`),
  ],
);

// Single source of truth: row types are inferred from the table definitions,
// so there is no hand-written entity interface to keep in sync.
export type BusinessCostLine = typeof businessCostLines.$inferSelect;
export type NewBusinessCostLine = typeof businessCostLines.$inferInsert;
export type CalcCostLine = typeof calcCostLines.$inferSelect;
export type NewCalcCostLine = typeof calcCostLines.$inferInsert;
