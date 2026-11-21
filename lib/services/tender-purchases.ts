import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod/v4";

import { latestAwards, orderTotals } from "@/lib/calc/purchaseOrder";
import { latestOffers, offerKey } from "@/lib/calc/tenderOffers";
import { itemsWithoutRoundOneOffers } from "@/lib/calc/tenderResults";
import { roundStartsAt, tenderPhase } from "@/lib/calc/tenderRounds";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { profiles } from "@/lib/db/profile/table";
import { suppliers } from "@/lib/db/suppliers/table";
import {
  purchaseOrderLines,
  purchaseOrders,
  tenderAwards,
  tenderInvitations,
  tenderItems,
  tenders,
  type Tender,
} from "@/lib/db/tenders/table";
import {
  awardItemInputSchema,
  negotiationInputSchema,
  purchaseOrderInputSchema,
} from "@/lib/db/tenders/validation";
import { AppError } from "@/lib/errors/app-error";
import type { VerifiedUserId } from "@/lib/services/auth";
import { getOwnedTender, loadAwards, loadOffers, type Tx } from "@/lib/services/tenders";

// After the close: choosing a supplier per item (RN-14), negotiating (RN-21),
// purchase orders (RN-15), the thank-you note (RN-16) and the history
// (RN-17). Emprendedor side only; every write is scoped to the owner's
// tender. Nothing here sends anything outside the app (RN-24).

const UNNAMED_OWNER = "Emprendedor sin nombre";
const orderIdSchema = z.uuid();

// Choosing and buying only make sense once the tender closed by itself
// (RN-12); a cancelled tender has nothing to buy.
function requireClosed(tender: Tender, now: Date): void {
  if (tenderPhase(tender, now) !== "closed") throw new AppError("TENDER_NOT_CLOSED");
}

async function requireInvitation(tenderId: string, invitationId: string, db: Db | Tx) {
  const [invitation] = await db
    .select()
    .from(tenderInvitations)
    .where(and(eq(tenderInvitations.id, invitationId), eq(tenderInvitations.tenderId, tenderId)))
    .limit(1);
  if (!invitation) throw new AppError("TENDER_NOT_FOUND");
  return invitation;
}

async function invitationsWithOrder(tenderId: string, db: Db | Tx): Promise<Set<string>> {
  const rows = await db
    .select({ invitationId: purchaseOrders.invitationId })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.tenderId, tenderId));
  return new Set(rows.map((row) => row.invitationId));
}

// RN-14: "El emprendedor decide con qué proveedor contacta para comprar cada
// insumo. Puede repartir la compra por ítem y negociar." One supplier per
// item, among those that offered for it, at the agreed unit price. A new
// choice replaces the previous one unless a purchase order already covers it.
export async function awardItemService(
  userId: VerifiedUserId,
  tenderId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<void> {
  const data = awardItemInputSchema.parse(input);
  const tender = await getOwnedTender(userId, tenderId, db);
  requireClosed(tender, now);
  await requireInvitation(tender.id, data.invitationId, db);

  const [item] = await db
    .select({ id: tenderItems.id })
    .from(tenderItems)
    .where(and(eq(tenderItems.id, data.itemId), eq(tenderItems.tenderId, tender.id)))
    .limit(1);
  if (!item) throw new AppError("TENDER_NOT_FOUND");

  const offers = latestOffers(await loadOffers(tender.id, db, data.invitationId));
  if (!offers.has(offerKey(data.invitationId, item.id))) throw new AppError("TENDER_NO_OFFER");

  await db.transaction(async (tx) => {
    await tx.select({ id: tenders.id }).from(tenders).where(eq(tenders.id, tender.id)).for("update");
    const ordered = await invitationsWithOrder(tender.id, tx);
    const current = latestAwards(await loadAwards(tender.id, tx)).get(item.id);
    if (ordered.has(data.invitationId) || (current && ordered.has(current.invitationId))) {
      throw new AppError("TENDER_ORDER_EXISTS");
    }
    await tx.insert(tenderAwards).values({
      tenderItemId: item.id,
      invitationId: data.invitationId,
      unitPrice: data.unitPrice,
      createdAt: now,
    });
  });
}

// RN-21: the supplier is told in its panel and gets the emprendedor's contact.
// Only suppliers that offered for at least one item (N-27). Recorded once;
// asking again keeps the first request.
export async function requestNegotiationService(
  userId: VerifiedUserId,
  tenderId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<void> {
  const data = negotiationInputSchema.parse(input);
  const tender = await getOwnedTender(userId, tenderId, db);
  requireClosed(tender, now);
  await requireInvitation(tender.id, data.invitationId, db);
  if ((await loadOffers(tender.id, db, data.invitationId)).length === 0) throw new AppError("TENDER_NO_OFFER");

  await db
    .update(tenderInvitations)
    .set({ negotiationRequestedAt: now, negotiationContact: data.contact })
    .where(and(eq(tenderInvitations.id, data.invitationId), isNull(tenderInvitations.negotiationRequestedAt)));
}

// RN-15: one purchase order per awarded supplier, built from the current
// choices for that supplier, with the delivery and payment terms the
// emprendedor completes. Final once issued.
export async function issuePurchaseOrderService(
  userId: VerifiedUserId,
  tenderId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<{ id: string; number: number }> {
  const data = purchaseOrderInputSchema.parse(input);
  const tender = await getOwnedTender(userId, tenderId, db);
  requireClosed(tender, now);
  await requireInvitation(tender.id, data.invitationId, db);

  return db.transaction(async (tx) => {
    // The profile lock keeps the per-emprendedor order number unique; the
    // tender lock keeps choices from changing while the order is written.
    await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, userId)).for("update");
    await tx.select({ id: tenders.id }).from(tenders).where(eq(tenders.id, tender.id)).for("update");

    if ((await invitationsWithOrder(tender.id, tx)).has(data.invitationId)) {
      throw new AppError("TENDER_ORDER_EXISTS");
    }

    const awarded = [...latestAwards(await loadAwards(tender.id, tx)).values()].filter(
      (award) => award.invitationId === data.invitationId,
    );
    if (awarded.length === 0) throw new AppError("TENDER_NOTHING_AWARDED");

    const items = await tx
      .select()
      .from(tenderItems)
      .where(eq(tenderItems.tenderId, tender.id))
      .orderBy(asc(tenderItems.position));
    const lines = items.flatMap((item) => {
      const award = awarded.find((a) => a.itemId === item.id);
      return award ? [{ item, unitPrice: award.unitPrice }] : [];
    });
    const totals = orderTotals(lines.map((line) => ({ quantity: line.item.quantity, unitPrice: line.unitPrice })));

    const [last] = await tx
      .select({ number: sql<number | null>`max(${purchaseOrders.number})` })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.ownerUserId, userId));
    const number = Number(last?.number ?? 0) + 1;

    const [order] = await tx
      .insert(purchaseOrders)
      .values({
        ownerUserId: userId,
        tenderId: tender.id,
        invitationId: data.invitationId,
        number,
        deliveryTerms: data.deliveryTerms,
        paymentTerms: data.paymentTerms,
        total: totals.total,
        issuedAt: now,
      })
      .returning({ id: purchaseOrders.id, number: purchaseOrders.number });
    if (!order) throw new AppError("INTERNAL", { cause: "issuePurchaseOrderService: no row returned" });

    await tx.insert(purchaseOrderLines).values(
      lines.map((line, index) => ({
        orderId: order.id,
        tenderItemId: line.item.id,
        position: index + 1,
        supplyName: line.item.supplyName,
        unit: line.item.unit,
        quantity: line.item.quantity,
        unitPrice: line.unitPrice,
        lineTotal: totals.lines[index],
      })),
    );

    return order;
  });
}

export type PurchaseOrderView = {
  id: string;
  number: number;
  tenderId: string;
  tenderNumber: number;
  issuedAt: Date;
  ownerName: string;
  supplier: { businessName: string; cuit: string; contactName: string; phone: string; email: string };
  deliveryTerms: string;
  paymentTerms: string;
  total: string;
  lines: { supplyName: string; unit: string; quantity: string; unitPrice: string; lineTotal: string }[];
};

// The printable purchase order (RN-15): the emprendedor prints it or saves it
// as PDF and sends it by their own means.
export async function getPurchaseOrderService(
  userId: VerifiedUserId,
  orderId: string,
  db: Db = getDrizzleClient(),
): Promise<PurchaseOrderView> {
  if (!orderIdSchema.safeParse(orderId).success) throw new AppError("TENDER_NOT_FOUND");
  const [row] = await db
    .select({
      order: purchaseOrders,
      tenderNumber: tenders.number,
      ownerName: profiles.displayName,
      supplier: {
        businessName: suppliers.businessName,
        cuit: suppliers.cuit,
        contactName: suppliers.contactName,
        phone: suppliers.phone,
        email: suppliers.email,
      },
    })
    .from(purchaseOrders)
    .innerJoin(tenders, eq(tenders.id, purchaseOrders.tenderId))
    .innerJoin(profiles, eq(profiles.id, purchaseOrders.ownerUserId))
    .innerJoin(tenderInvitations, eq(tenderInvitations.id, purchaseOrders.invitationId))
    .innerJoin(suppliers, eq(suppliers.userId, tenderInvitations.supplierUserId))
    .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.ownerUserId, userId)))
    .limit(1);
  if (!row) throw new AppError("TENDER_NOT_FOUND");

  const lines = await db
    .select({
      supplyName: purchaseOrderLines.supplyName,
      unit: purchaseOrderLines.unit,
      quantity: purchaseOrderLines.quantity,
      unitPrice: purchaseOrderLines.unitPrice,
      lineTotal: purchaseOrderLines.lineTotal,
    })
    .from(purchaseOrderLines)
    .where(eq(purchaseOrderLines.orderId, row.order.id))
    .orderBy(asc(purchaseOrderLines.position));

  return {
    id: row.order.id,
    number: row.order.number,
    tenderId: row.order.tenderId,
    tenderNumber: row.tenderNumber,
    issuedAt: row.order.issuedAt,
    ownerName: row.ownerName ?? UNNAMED_OWNER,
    supplier: row.supplier,
    deliveryTerms: row.order.deliveryTerms,
    paymentTerms: row.order.paymentTerms,
    total: row.order.total,
    lines,
  };
}

// RN-16: "Si el emprendedor lo ordena, la aplicación muestra en el panel de
// los proveedores no elegidos una nota de agradecimiento idéntica para todos".
// Recorded once; the suppliers without a chosen item see it.
export async function sendThankYouNoteService(
  userId: VerifiedUserId,
  tenderId: string,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<void> {
  const tender = await getOwnedTender(userId, tenderId, db);
  requireClosed(tender, now);
  await db
    .update(tenders)
    .set({ thankYouNoteAt: now })
    .where(and(eq(tenders.id, tender.id), isNull(tenders.thankYouNoteAt)));
}

export type TenderHistoryEvent =
  | { kind: "published"; at: Date; roundHours: number; roundCount: number; decrementPercent: string }
  | { kind: "round"; at: Date; round: number }
  | { kind: "offer"; at: Date; supplier: string; item: string; round: number; unitPrice: string }
  | { kind: "no_offers_warning"; at: Date; items: string[] }
  | { kind: "warning_ack"; at: Date }
  | { kind: "cancelled"; at: Date }
  | { kind: "closed"; at: Date; isVoid: boolean }
  | { kind: "award"; at: Date; supplier: string; item: string; unitPrice: string }
  | { kind: "negotiation"; at: Date; supplier: string }
  | { kind: "order"; at: Date; supplier: string; number: number; total: string }
  | { kind: "thank_you"; at: Date };

// RN-17: the whole process with date and time, oldest first, built from the
// stored rows (offers, choices and orders are never modified).
export async function getTenderHistoryService(
  userId: VerifiedUserId,
  tenderId: string,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<TenderHistoryEvent[]> {
  const tender = await getOwnedTender(userId, tenderId, db);
  const [items, invitations, offers, awards, orders] = await Promise.all([
    db.select({ id: tenderItems.id, name: tenderItems.supplyName }).from(tenderItems).where(eq(tenderItems.tenderId, tender.id)),
    db
      .select({
        id: tenderInvitations.id,
        name: suppliers.businessName,
        negotiationRequestedAt: tenderInvitations.negotiationRequestedAt,
      })
      .from(tenderInvitations)
      .innerJoin(suppliers, eq(suppliers.userId, tenderInvitations.supplierUserId))
      .where(eq(tenderInvitations.tenderId, tender.id)),
    loadOffers(tender.id, db),
    loadAwards(tender.id, db),
    db.select().from(purchaseOrders).where(eq(purchaseOrders.tenderId, tender.id)),
  ]);
  const itemName = new Map(items.map((item) => [item.id, item.name]));
  const supplierName = new Map(invitations.map((invitation) => [invitation.id, invitation.name]));

  const events: TenderHistoryEvent[] = [
    {
      kind: "published",
      at: tender.startsAt,
      roundHours: tender.roundHours,
      roundCount: tender.roundCount,
      decrementPercent: tender.decrementPercent,
    },
  ];

  // Rounds that started before the tender stopped (close or cancellation).
  const stoppedAt = tender.cancelledAt ?? tender.endsAt;
  const until = Math.min(now.getTime(), stoppedAt.getTime());
  for (let round = 2; round <= tender.roundCount; round++) {
    const at = roundStartsAt(tender, round);
    if (at.getTime() < until) events.push({ kind: "round", at, round });
  }

  for (const offer of offers) {
    events.push({
      kind: "offer",
      at: offer.createdAt,
      supplier: supplierName.get(offer.invitationId) ?? "",
      item: itemName.get(offer.itemId) ?? "",
      round: offer.round,
      unitPrice: offer.unitPrice,
    });
  }
  // RN-18: the warning appeared when round 1 ended with items nobody quoted.
  const roundTwo = roundStartsAt(tender, 2);
  const withoutOffers = itemsWithoutRoundOneOffers(items, offers);
  if (withoutOffers.length > 0 && roundTwo.getTime() < until) {
    events.push({ kind: "no_offers_warning", at: roundTwo, items: withoutOffers.map((id) => itemName.get(id) ?? "") });
  }
  if (tender.noOfferWarningAckAt) events.push({ kind: "warning_ack", at: tender.noOfferWarningAckAt });
  if (tender.cancelledAt) events.push({ kind: "cancelled", at: tender.cancelledAt });
  else if (now.getTime() >= tender.endsAt.getTime()) {
    events.push({ kind: "closed", at: tender.endsAt, isVoid: offers.length === 0 });
  }
  for (const award of awards) {
    events.push({
      kind: "award",
      at: award.createdAt,
      supplier: supplierName.get(award.invitationId) ?? "",
      item: itemName.get(award.itemId) ?? "",
      unitPrice: award.unitPrice,
    });
  }
  for (const invitation of invitations) {
    if (invitation.negotiationRequestedAt) {
      events.push({ kind: "negotiation", at: invitation.negotiationRequestedAt, supplier: invitation.name });
    }
  }
  for (const order of orders) {
    events.push({
      kind: "order",
      at: order.issuedAt,
      supplier: supplierName.get(order.invitationId) ?? "",
      number: order.number,
      total: order.total,
    });
  }
  if (tender.thankYouNoteAt) events.push({ kind: "thank_you", at: tender.thankYouNoteAt });

  // Stable sort: events of the same instant keep the order above.
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}
