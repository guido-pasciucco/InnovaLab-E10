import { integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

// Distributed consumption state for the help assistant. It stores only
// counters and a short lease; conversation content never leaves the browser.
export const helpUsage = pgTable("help_usage", {
  userId: uuid("user_id").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  requestCount: integer("request_count").notNull().default(0),
  activeLeaseId: uuid("active_lease_id"),
  activeUntil: timestamp("active_until", { withTimezone: true }),
});
