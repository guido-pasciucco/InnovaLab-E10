import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { profiles } from "../profile/table";

// Suppliers for supply tenders (docs/flujos/09-licitaciones.md, RN-22 and RN-23).
//
// A supplier is a regular account (auth user + profile) that also has a row in
// `suppliers`; that row is what makes the account a supplier. One account per
// supplier: the CUIT is unique, so a person cannot register twice (#309).
//
// Registration is public: there are no invitation links and no relation to an
// emprendedor (issue #309). Every registered supplier sees every active tender.
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
    // Rubros declared by the supplier (free text, part of the public registry).
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

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
