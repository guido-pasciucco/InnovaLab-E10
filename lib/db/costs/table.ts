import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { businesses } from "../business/table";
import { calculations, scenarios } from "../calculation/table";

// ---------------------------------------------------------------------------
// Server-side persistence (ADR 02): real tables modeled from
// erd-calculadora-inteligente.mmd. Consumed only by lib/services through
// getDb(); never imported by domain code (lib/calc, lib/money) or client code.
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
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
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

// Single source of truth: row types are inferred from the table definitions,
// so there is no hand-written entity interface to keep in sync.
export type BusinessCostLine = typeof businessCostLines.$inferSelect;
export type NewBusinessCostLine = typeof businessCostLines.$inferInsert;
export type CalcCostLine = typeof calcCostLines.$inferSelect;
export type NewCalcCostLine = typeof calcCostLines.$inferInsert;
