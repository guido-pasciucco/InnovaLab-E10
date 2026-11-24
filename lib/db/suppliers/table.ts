import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "../profile/table";

// Suppliers for supply tenders (docs/flujos/09-licitaciones.md, RN-22 and RN-23).
//
// A supplier is a regular account (auth user + profile) that also has a row in
// `suppliers`; that row is what makes the account a supplier. One account per
// supplier: the CUIT is unique, so a second emprendedor links the existing
// account instead of creating another one (RN-22).
//
// `supplier_links` is the "registered with that emprendedor" relation: the
// emprendedor only sees and invites the suppliers linked to them, and never
// which other emprendedores a supplier works with.
//
// `supplier_invites` holds the personal invite links. Only a SHA-256 hash of
// the token is stored: the raw token travels once, in the link the emprendedor
// copies, so a database read cannot be turned into working links.
// ---------------------------------------------------------------------------

export const suppliers = pgTable(
  "suppliers",
  {
    // Same id as the account's profile: one supplier row per account.
    userId: uuid("user_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    // 11 bare digits, check digit verified by the service (cuitField).
    cuit: text("cuit").notNull().unique(),
    contactName: text("contact_name").notNull(),
    phone: text("phone").notNull(),
    // Contact email shown to the emprendedores: the confirmed account email,
    // copied at registration because auth.users is outside this schema.
    email: text("email").notNull(),
    // Rubros declared by the supplier (free text, shown when publishing).
    categories: text("categories").array().notNull(),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [check("suppliers_cuit_format", sql`${table.cuit} ~ '^[0-9]{11}$'`)],
);

export const supplierLinks = pgTable(
  "supplier_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // The emprendedor.
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    supplierUserId: uuid("supplier_user_id")
      .notNull()
      .references(() => suppliers.userId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("supplier_links_owner_supplier_uq").on(table.ownerUserId, table.supplierUserId),
    index("supplier_links_supplier_idx").on(table.supplierUserId),
  ],
);

export const supplierInvites = pgTable(
  "supplier_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // Who the link is for, typed by the emprendedor.
    label: text("label").notNull(),
    // SHA-256 (hex) of the token in the link.
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Single use: set once, when a supplier registers or links with it.
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedBySupplierUserId: uuid("used_by_supplier_user_id").references(
      () => suppliers.userId,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("supplier_invites_owner_idx").on(table.ownerUserId)],
);

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type SupplierLink = typeof supplierLinks.$inferSelect;
export type SupplierInvite = typeof supplierInvites.$inferSelect;
