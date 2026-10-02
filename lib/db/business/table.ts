import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { profiles } from "../profile/table";

// ---------------------------------------------------------------------------
// Evaluation spike only: real tables modeled from erd-calculadora-inteligente.mmd.
// Not wired to any database and not imported by domain code (lib/calc,
// lib/money) or any route. Table names are snake_case in Postgres while
// fields stay camelCase in TypeScript, per the official Drizzle docs.
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

// Single source of truth: row types are inferred from the table definitions,
// so there is no hand-written entity interface to keep in sync.
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
