import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import type { ClosureSnapshot } from "@/lib/types/closure";

import { businesses } from "../business/table";

// Monthly calculation closures (#322, D5-D8 and D46). Append-only: a month can
// have several versions, and a version is never edited or deleted. The only
// deletion path is the cascade when the business (and with it the account) is
// deleted. No update or delete service is exposed for this table.
export const calcClosures = pgTable(
  "calc_closures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    // Month of the closure in America/Argentina/Buenos_Aires, as "AAAA-MM".
    period: text("period").notNull(),
    version: integer("version").notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }).notNull().defaultNow(),
    snapshot: jsonb("snapshot").$type<ClosureSnapshot>().notNull(),
    snapshotSchemaVersion: integer("snapshot_schema_version").notNull(),
  },
  (table) => [
    uniqueIndex("calc_closures_business_period_version_uq").on(
      table.businessId,
      table.period,
      table.version,
    ),
  ],
);

export type CalcClosure = typeof calcClosures.$inferSelect;
export type NewCalcClosure = typeof calcClosures.$inferInsert;
