import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "../profile/table";
import { suppliers } from "../suppliers/table";
import { supplies } from "../supplies/table";

// Supply tenders (docs/flujos/09-licitaciones.md). A tender is published once and never
// edited (RN-03): there is no update path, only cancellation. Rounds are not
// stored: they follow from starts_at, round_hours and round_count
// (lib/calc/tenderRounds.ts), so they advance with the server clock and no
// scheduled job (RN-09, RN-12).
//
// Items copy the supply name, unit and catalog price at publish time, so the
// tender history stays as it was published (RN-17) even if the catalog
// changes or the supply is deleted later (supply_id then becomes null).
// ---------------------------------------------------------------------------

export const tenders = pgTable(
  "tenders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // Correlative per emprendedor (RN-02).
    number: integer("number").notNull(),
    roundHours: integer("round_hours").notNull(),
    roundCount: integer("round_count").notNull(),
    // % de baja per round, set once at publish (RN-09).
    decrementPercent: numeric("decrement_percent", { precision: 5, scale: 2 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    // RN-18: when the emprendedor chose to let it continue after the
    // "items without offers" warning (the warning is shown only once).
    noOfferWarningAckAt: timestamp("no_offer_warning_ack_at", { withTimezone: true }),
    // RN-16: when the emprendedor ordered the thank-you note.
    thankYouNoteAt: timestamp("thank_you_note_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("tenders_owner_number_uq").on(table.ownerUserId, table.number),
    check("tenders_round_hours_valid", sql`${table.roundHours} in (6, 12, 24)`),
    check("tenders_round_count_valid", sql`${table.roundCount} between 2 and 5`),
    check(
      "tenders_decrement_percent_valid",
      sql`${table.decrementPercent} > 0 and ${table.decrementPercent} <= 50`,
    ),
    check("tenders_ends_after_start", sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

export const tenderItems = pgTable(
  "tender_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenderId: uuid("tender_id")
      .notNull()
      .references(() => tenders.id, { onDelete: "cascade" }),
    supplyId: uuid("supply_id").references(() => supplies.id, { onDelete: "set null" }),
    position: integer("position").notNull(),
    supplyName: text("supply_name").notNull(),
    // Catalog purchase unit: prices are per this unit (RN-04).
    unit: text("unit").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    specs: text("specs").notNull().default(""),
    startingPrice: numeric("starting_price", { precision: 12, scale: 2 }).notNull(),
    // Catalog price per unit at publish: the "último precio registrado del
    // insumo" of RN-13. Never shown to suppliers (RN-07).
    referencePrice: numeric("reference_price", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("tender_items_tender_position_uq").on(table.tenderId, table.position),
    check("tender_items_quantity_positive", sql`${table.quantity} > 0`),
    check("tender_items_starting_price_positive", sql`${table.startingPrice} > 0`),
  ],
);

export const tenderInvitations = pgTable(
  "tender_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenderId: uuid("tender_id")
      .notNull()
      .references(() => tenders.id, { onDelete: "cascade" }),
    supplierUserId: uuid("supplier_user_id")
      .notNull()
      .references(() => suppliers.userId, { onDelete: "cascade" }),
    // RN-21: set once, when the emprendedor asks to negotiate.
    negotiationRequestedAt: timestamp("negotiation_requested_at", { withTimezone: true }),
    negotiationContact: text("negotiation_contact"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("tender_invitations_tender_supplier_uq").on(table.tenderId, table.supplierUserId),
    index("tender_invitations_supplier_idx").on(table.supplierUserId),
  ],
);

// Offers (RN-10, RN-20). Append-only: a new offer is a new row and nothing is
// updated or deleted by the services, so every offer stays in the history
// with its round and time (RN-17). The supplier's current offer for an item
// is its latest row; no row means it did not quote that item.
export const tenderOffers = pgTable(
  "tender_offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenderItemId: uuid("tender_item_id")
      .notNull()
      .references(() => tenderItems.id, { onDelete: "cascade" }),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => tenderInvitations.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tender_offers_invitation_item_idx").on(table.invitationId, table.tenderItemId),
    index("tender_offers_item_idx").on(table.tenderItemId),
    check("tender_offers_unit_price_positive", sql`${table.unitPrice} > 0`),
    check("tender_offers_round_positive", sql`${table.round} >= 1`),
  ],
);

// The emprendedor's choice of supplier per item (RN-14), with the agreed unit
// price (the supplier's last offer unless negotiated otherwise). Append-only:
// the current choice is the latest row, and earlier choices stay in the
// history (RN-17). One supplier per item; the purchase can be split across
// items.
export const tenderAwards = pgTable(
  "tender_awards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenderItemId: uuid("tender_item_id")
      .notNull()
      .references(() => tenderItems.id, { onDelete: "cascade" }),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => tenderInvitations.id, { onDelete: "cascade" }),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tender_awards_item_idx").on(table.tenderItemId),
    check("tender_awards_unit_price_positive", sql`${table.unitPrice} > 0`),
  ],
);

// RN-15: one purchase order per awarded supplier. Once issued it is final:
// its lines are copied here and the awards it covers can no longer change.
export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tenderId: uuid("tender_id")
      .notNull()
      .references(() => tenders.id, { onDelete: "cascade" }),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => tenderInvitations.id, { onDelete: "cascade" }),
    // Correlative per emprendedor, separate from the tender number.
    number: integer("number").notNull(),
    deliveryTerms: text("delivery_terms").notNull(),
    paymentTerms: text("payment_terms").notNull(),
    total: numeric("total", { precision: 14, scale: 2 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("purchase_orders_owner_number_uq").on(table.ownerUserId, table.number),
    unique("purchase_orders_tender_invitation_uq").on(table.tenderId, table.invitationId),
  ],
);

export const purchaseOrderLines = pgTable(
  "purchase_order_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    tenderItemId: uuid("tender_item_id")
      .notNull()
      .references(() => tenderItems.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    supplyName: text("supply_name").notNull(),
    unit: text("unit").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
  },
  (table) => [index("purchase_order_lines_order_idx").on(table.orderId)],
);

// Unpublished tender form of an emprendedor: one per emprendedor, saved
// before publishing (for example, before any supplier is registered). The
// content is the half-filled form, validated loosely on save and fully on
// publish, so it is stored as one JSON document. Supplies deleted from the
// catalog are dropped when the draft is loaded.
export type TenderDraftContent = {
  roundHours: string;
  roundCount: string;
  decrementPercent: string;
  items: { supplyId: string; quantity: string; specs: string; startingPrice: string }[];
  // Linked suppliers the emprendedor unticked; suppliers registered later
  // start invited, as on a new form.
  excludedSupplierIds: string[];
};

export const tenderDrafts = pgTable("tender_drafts", {
  ownerUserId: uuid("owner_user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  content: jsonb("content").$type<TenderDraftContent>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Tender = typeof tenders.$inferSelect;
export type TenderOffer = typeof tenderOffers.$inferSelect;
export type TenderItem = typeof tenderItems.$inferSelect;
export type TenderInvitation = typeof tenderInvitations.$inferSelect;
