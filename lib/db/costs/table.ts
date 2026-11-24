import { sql } from "drizzle-orm";
import { index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { businesses } from "../business/table";

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

export const businessCostLines = pgTable(
  "business_cost_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    // Month the expense belongs to (#243), as "YYYY-MM". The calculator is
    // monthly, so this key replaces a full date and avoids timezone drift.
    // The default backfills rows created before the column existed and keeps
    // the column NOT NULL; services always send the period explicitly.
    period: text("period")
      .notNull()
      .default(sql`to_char(now(), 'YYYY-MM')`),
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
  },
  (table) => [
    // The period list is always business + month. One index covers both the
    // service filter and the period aggregate read.
    index("business_cost_lines_business_period_idx").on(
      table.businessId,
      table.period,
    ),
  ],
);

// Single source of truth: row types are inferred from the table definitions,
// so there is no hand-written entity interface to keep in sync.
export type BusinessCostLine = typeof businessCostLines.$inferSelect;
export type NewBusinessCostLine = typeof businessCostLines.$inferInsert;
