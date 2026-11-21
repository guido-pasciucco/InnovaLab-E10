import "server-only";

import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod/v4";

import { checkOffer, latestOffers, offerKey, type OfferRecord } from "@/lib/calc/tenderOffers";
import {
  catalogUnitPrice,
  currentRound,
  targetPrices,
  tenderEndsAt,
  tenderPhase,
  type TenderPhase,
} from "@/lib/calc/tenderRounds";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { profiles } from "@/lib/db/profile/table";
import { supplierLinks, suppliers } from "@/lib/db/suppliers/table";
import { supplies } from "@/lib/db/supplies/table";
import {
  tenderInvitations,
  tenderItems,
  tenderOffers,
  tenders,
  type Tender,
} from "@/lib/db/tenders/table";
import { publishTenderInputSchema, submitOffersInputSchema } from "@/lib/db/tenders/validation";
import { AppError } from "@/lib/errors/app-error";
import { formatARS } from "@/lib/money/format";
import { offerAboveLastMessage, offerAboveStartingMessage } from "@/lib/schemas/tenders/fields";
import type { VerifiedUserId } from "@/lib/services/auth";
import { listLinkedSuppliersService, type LinkedSupplier } from "@/lib/services/suppliers";

// Supply tenders, emprendedor and supplier sides (docs/licitaciones).
// Owner scoping: emprendedor reads and writes filter by owner_user_id; the
// supplier side only reaches tenders it was invited to. Services throw;
// doors translate. `now` is a parameter so the clock-driven rules (rounds,
// closing) are testable; doors leave the default (the server clock, RN-12).

const UNNAMED_OWNER = "Emprendedor sin nombre";
const tenderIdSchema = z.uuid();

export type { TenderPhase };

// ---------------------------------------------------------------------------
// Publish (RN-01 to RN-05)
// ---------------------------------------------------------------------------

export type TenderFormSupply = {
  id: string;
  name: string;
  kind: string;
  unit: string;
  suggestedPrice: string;
};

export type TenderFormData = {
  supplies: TenderFormSupply[];
  suppliers: LinkedSupplier[];
  activeTender: { id: string; number: number } | null;
};

async function findActiveTender(userId: VerifiedUserId, db: Db | Tx, now: Date) {
  const [row] = await db
    .select({ id: tenders.id, number: tenders.number })
    .from(tenders)
    .where(and(eq(tenders.ownerUserId, userId), isNull(tenders.cancelledAt), gt(tenders.endsAt, now)))
    .limit(1);
  return row ?? null;
}

// What the publish form needs: the catalog with the suggested starting price
// (RN-02), every linked supplier preselected with its rubros (RN-05), and the
// active tender if there is one (RN-03).
export async function getTenderFormDataService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<TenderFormData> {
  const [catalog, linked, activeTender] = await Promise.all([
    db
      .select()
      .from(supplies)
      .where(eq(supplies.userId, userId))
      .orderBy(asc(supplies.name), asc(supplies.id)),
    listLinkedSuppliersService(userId, db),
    findActiveTender(userId, db, now),
  ]);

  return {
    supplies: catalog.map((supply) => ({
      id: supply.id,
      name: supply.name,
      kind: supply.kind,
      unit: supply.purchaseUnit,
      suggestedPrice: catalogUnitPrice(supply.purchasePrice, supply.purchaseQuantity),
    })),
    suppliers: linked,
    activeTender,
  };
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export async function publishTenderService(
  userId: VerifiedUserId,
  input: unknown,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<{ id: string; number: number }> {
  const data = publishTenderInputSchema.parse(input);
  const supplyIds = data.items.map((item) => item.supplyId);

  return db.transaction(async (tx) => {
    // Serializes publishes of the same emprendedor, so the correlative number
    // and the "one active tender" check cannot race.
    await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, userId)).for("update");

    if (await findActiveTender(userId, tx, now)) throw new AppError("TENDER_ACTIVE_EXISTS");

    const catalog = await tx
      .select()
      .from(supplies)
      .where(and(eq(supplies.userId, userId), inArray(supplies.id, supplyIds)));
    if (catalog.length !== supplyIds.length) throw new AppError("TENDER_SUPPLY_NOT_FOUND");
    const supplyById = new Map(catalog.map((supply) => [supply.id, supply]));

    const links = await tx
      .select({ supplierUserId: supplierLinks.supplierUserId })
      .from(supplierLinks)
      .where(and(eq(supplierLinks.ownerUserId, userId), inArray(supplierLinks.supplierUserId, data.supplierIds)));
    if (links.length !== data.supplierIds.length) throw new AppError("TENDER_SUPPLIER_NOT_LINKED");

    const [last] = await tx
      .select({ number: sql<number | null>`max(${tenders.number})` })
      .from(tenders)
      .where(eq(tenders.ownerUserId, userId));
    const number = Number(last?.number ?? 0) + 1;

    const [tender] = await tx
      .insert(tenders)
      .values({
        ownerUserId: userId,
        number,
        roundHours: data.roundHours,
        roundCount: data.roundCount,
        decrementPercent: data.decrementPercent,
        startsAt: now,
        endsAt: tenderEndsAt(now, data.roundHours, data.roundCount),
        createdAt: now,
      })
      .returning({ id: tenders.id, number: tenders.number });
    if (!tender) throw new AppError("INTERNAL", { cause: "publishTenderService: no row returned" });

    await tx.insert(tenderItems).values(
      data.items.map((item, index) => {
        const supply = supplyById.get(item.supplyId)!;
        return {
          tenderId: tender.id,
          supplyId: supply.id,
          position: index + 1,
          supplyName: supply.name,
          unit: supply.purchaseUnit,
          quantity: item.quantity,
          specs: item.specs,
          startingPrice: item.startingPrice,
          referencePrice: catalogUnitPrice(supply.purchasePrice, supply.purchaseQuantity),
          createdAt: now,
        };
      }),
    );

    await tx.insert(tenderInvitations).values(
      data.supplierIds.map((supplierUserId) => ({ tenderId: tender.id, supplierUserId, createdAt: now })),
    );

    return tender;
  });
}

// RN-03: "solo puede cancelarse antes del cierre." Also the RN-18 way out.
export async function cancelTenderService(
  userId: VerifiedUserId,
  tenderId: string,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<{ cancelledAt: Date }> {
  const tender = await getOwnedTender(userId, tenderId, db);
  const [row] = await db
    .update(tenders)
    .set({ cancelledAt: now })
    .where(and(eq(tenders.id, tender.id), isNull(tenders.cancelledAt), gt(tenders.endsAt, now)))
    .returning({ cancelledAt: tenders.cancelledAt });
  if (!row?.cancelledAt) throw new AppError("TENDER_NOT_ACTIVE");
  return { cancelledAt: row.cancelledAt };
}

// ---------------------------------------------------------------------------
// Emprendedor reads
// ---------------------------------------------------------------------------

// The tender row if it belongs to the user; TENDER_NOT_FOUND otherwise
// (missing, foreign and malformed ids look the same).
export async function getOwnedTender(userId: VerifiedUserId, tenderId: string, db: Db | Tx): Promise<Tender> {
  if (!tenderIdSchema.safeParse(tenderId).success) throw new AppError("TENDER_NOT_FOUND");
  const [tender] = await db
    .select()
    .from(tenders)
    .where(and(eq(tenders.id, tenderId), eq(tenders.ownerUserId, userId)))
    .limit(1);
  if (!tender) throw new AppError("TENDER_NOT_FOUND");
  return tender;
}

export type TenderSummary = {
  id: string;
  number: number;
  phase: TenderPhase;
  startsAt: Date;
  endsAt: Date;
  currentRound: number | null;
  roundCount: number;
  itemCount: number;
  invitedCount: number;
};

export async function listTendersService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<TenderSummary[]> {
  const rows = await db
    .select()
    .from(tenders)
    .where(eq(tenders.ownerUserId, userId))
    .orderBy(desc(tenders.number));
  if (rows.length === 0) return [];

  const ids = rows.map((tender) => tender.id);
  const [itemCounts, invitedCounts] = await Promise.all([
    db
      .select({ tenderId: tenderItems.tenderId, count: sql<number>`count(*)::int` })
      .from(tenderItems)
      .where(inArray(tenderItems.tenderId, ids))
      .groupBy(tenderItems.tenderId),
    db
      .select({ tenderId: tenderInvitations.tenderId, count: sql<number>`count(*)::int` })
      .from(tenderInvitations)
      .where(inArray(tenderInvitations.tenderId, ids))
      .groupBy(tenderInvitations.tenderId),
  ]);
  const itemsBy = new Map(itemCounts.map((row) => [row.tenderId, Number(row.count)]));
  const invitedBy = new Map(invitedCounts.map((row) => [row.tenderId, Number(row.count)]));

  return rows.map((tender) => ({
    id: tender.id,
    number: tender.number,
    phase: tenderPhase(tender, now),
    startsAt: tender.startsAt,
    endsAt: tender.endsAt,
    currentRound: tenderPhase(tender, now) === "active" ? currentRound(tender, now) : null,
    roundCount: tender.roundCount,
    itemCount: itemsBy.get(tender.id) ?? 0,
    invitedCount: invitedBy.get(tender.id) ?? 0,
  }));
}

export type TenderDetailItem = {
  id: string;
  position: number;
  supplyName: string;
  unit: string;
  quantity: string;
  specs: string;
  startingPrice: string;
  referencePrice: string | null;
  targets: string[];
  currentTarget: string | null;
};

export type TenderDetailInvitation = {
  id: string;
  supplierUserId: string;
  businessName: string;
  cuit: string;
  contactName: string;
  phone: string;
  email: string;
  categories: string[];
  negotiationRequestedAt: Date | null;
  negotiationContact: string | null;
};

export type TenderDetail = {
  id: string;
  number: number;
  phase: TenderPhase;
  startsAt: Date;
  endsAt: Date;
  roundHours: number;
  roundCount: number;
  decrementPercent: string;
  currentRound: number | null;
  cancelledAt: Date | null;
  noOfferWarningAckAt: Date | null;
  thankYouNoteAt: Date | null;
  items: TenderDetailItem[];
  invitations: TenderDetailInvitation[];
  // Every offer, oldest first (RN-08: with identity, from the start).
  offers: OfferRecord[];
};

// Offers of a tender, oldest first; optionally only one supplier's.
async function loadOffers(tenderId: string, db: Db | Tx, invitationId?: string): Promise<OfferRecord[]> {
  return db
    .select({
      id: tenderOffers.id,
      itemId: tenderOffers.tenderItemId,
      invitationId: tenderOffers.invitationId,
      round: tenderOffers.round,
      unitPrice: tenderOffers.unitPrice,
      createdAt: tenderOffers.createdAt,
    })
    .from(tenderOffers)
    .innerJoin(tenderItems, eq(tenderItems.id, tenderOffers.tenderItemId))
    .where(
      invitationId
        ? and(eq(tenderItems.tenderId, tenderId), eq(tenderOffers.invitationId, invitationId))
        : eq(tenderItems.tenderId, tenderId),
    )
    .orderBy(asc(tenderOffers.createdAt), asc(tenderOffers.round), desc(tenderOffers.unitPrice));
}

async function loadItems(tender: Tender, db: Db | Tx, now: Date): Promise<TenderDetailItem[]> {
  const rows = await db
    .select()
    .from(tenderItems)
    .where(eq(tenderItems.tenderId, tender.id))
    .orderBy(asc(tenderItems.position));
  const round = tenderPhase(tender, now) === "active" ? currentRound(tender, now) : null;

  return rows.map((item) => {
    const targets = targetPrices(item.startingPrice, tender.decrementPercent, tender.roundCount);
    return {
      id: item.id,
      position: item.position,
      supplyName: item.supplyName,
      unit: item.unit,
      quantity: item.quantity,
      specs: item.specs,
      startingPrice: item.startingPrice,
      referencePrice: item.referencePrice,
      targets,
      currentTarget: round ? targets[round - 1] : null,
    };
  });
}

// Full detail for the emprendedor: terms, items with every round's target,
// and the invited suppliers with their identity (RN-08).
export async function getTenderDetailService(
  userId: VerifiedUserId,
  tenderId: string,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<TenderDetail> {
  const tender = await getOwnedTender(userId, tenderId, db);
  const [items, invitations, offers] = await Promise.all([
    loadItems(tender, db, now),
    db
      .select({
        id: tenderInvitations.id,
        supplierUserId: tenderInvitations.supplierUserId,
        businessName: suppliers.businessName,
        cuit: suppliers.cuit,
        contactName: suppliers.contactName,
        phone: suppliers.phone,
        email: suppliers.email,
        categories: suppliers.categories,
        negotiationRequestedAt: tenderInvitations.negotiationRequestedAt,
        negotiationContact: tenderInvitations.negotiationContact,
      })
      .from(tenderInvitations)
      .innerJoin(suppliers, eq(suppliers.userId, tenderInvitations.supplierUserId))
      .where(eq(tenderInvitations.tenderId, tender.id))
      .orderBy(asc(suppliers.businessName)),
    loadOffers(tender.id, db),
  ]);

  const phase = tenderPhase(tender, now);
  return {
    id: tender.id,
    number: tender.number,
    phase,
    startsAt: tender.startsAt,
    endsAt: tender.endsAt,
    roundHours: tender.roundHours,
    roundCount: tender.roundCount,
    decrementPercent: tender.decrementPercent,
    currentRound: phase === "active" ? currentRound(tender, now) : null,
    cancelledAt: tender.cancelledAt,
    noOfferWarningAckAt: tender.noOfferWarningAckAt,
    thankYouNoteAt: tender.thankYouNoteAt,
    items,
    invitations,
    offers,
  };
}

// ---------------------------------------------------------------------------
// Supplier reads (RN-06, RN-07, RN-22)
// ---------------------------------------------------------------------------

export type SupplierTenderSummary = {
  id: string;
  number: number;
  ownerUserId: string;
  ownerName: string;
  phase: TenderPhase;
  startsAt: Date;
  endsAt: Date;
  currentRound: number | null;
  roundCount: number;
};

// Every tender the supplier was invited to, with the emprendedor's name so the
// panel can group them (RN-22: "separadas por emprendedor").
export async function listSupplierTendersService(
  supplierUserId: VerifiedUserId,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<SupplierTenderSummary[]> {
  const rows = await db
    .select({ tender: tenders, ownerName: profiles.displayName })
    .from(tenderInvitations)
    .innerJoin(tenders, eq(tenders.id, tenderInvitations.tenderId))
    .innerJoin(profiles, eq(profiles.id, tenders.ownerUserId))
    .where(eq(tenderInvitations.supplierUserId, supplierUserId))
    .orderBy(desc(tenders.startsAt));

  return rows.map(({ tender, ownerName }) => {
    const phase = tenderPhase(tender, now);
    return {
      id: tender.id,
      number: tender.number,
      ownerUserId: tender.ownerUserId,
      ownerName: ownerName ?? UNNAMED_OWNER,
      phase,
      startsAt: tender.startsAt,
      endsAt: tender.endsAt,
      currentRound: phase === "active" ? currentRound(tender, now) : null,
      roundCount: tender.roundCount,
    };
  });
}

export type SupplierTenderItem = {
  id: string;
  supplyName: string;
  unit: string;
  quantity: string;
  specs: string;
  startingPrice: string;
  currentTarget: string | null;
  // This supplier's current offer (latest) and its history, oldest first.
  myLastPrice: string | null;
  myOffers: { round: number; unitPrice: string; createdAt: Date }[];
};

export type SupplierTenderView = {
  id: string;
  number: number;
  invitationId: string;
  ownerName: string;
  phase: TenderPhase;
  startsAt: Date;
  endsAt: Date;
  currentRound: number | null;
  roundCount: number;
  roundHours: number;
  items: SupplierTenderItem[];
  negotiation: { requestedAt: Date; contact: string } | null;
  showThankYouNote: boolean;
};

// The invitation of this supplier to this tender, or TENDER_NOT_FOUND.
export async function getSupplierInvitation(
  supplierUserId: VerifiedUserId,
  tenderId: string,
  db: Db | Tx,
): Promise<{ invitation: typeof tenderInvitations.$inferSelect; tender: Tender; ownerName: string }> {
  if (!tenderIdSchema.safeParse(tenderId).success) throw new AppError("TENDER_NOT_FOUND");
  const [row] = await db
    .select({ invitation: tenderInvitations, tender: tenders, ownerName: profiles.displayName })
    .from(tenderInvitations)
    .innerJoin(tenders, eq(tenders.id, tenderInvitations.tenderId))
    .innerJoin(profiles, eq(profiles.id, tenders.ownerUserId))
    .where(and(eq(tenderInvitations.tenderId, tenderId), eq(tenderInvitations.supplierUserId, supplierUserId)))
    .limit(1);
  if (!row) throw new AppError("TENDER_NOT_FOUND");
  return { invitation: row.invitation, tender: row.tender, ownerName: row.ownerName ?? UNNAMED_OWNER };
}

// What the supplier may see (RN-06): start and end, items, quantities,
// starting price and the target in force. Never the catalog reference price
// (RN-07), the % de baja, the other suppliers or their offers.
export async function getSupplierTenderService(
  supplierUserId: VerifiedUserId,
  tenderId: string,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<SupplierTenderView> {
  const { invitation, tender, ownerName } = await getSupplierInvitation(supplierUserId, tenderId, db);
  const [items, offers] = await Promise.all([loadItems(tender, db, now), loadOffers(tender.id, db, invitation.id)]);
  const latest = latestOffers(offers);
  const phase = tenderPhase(tender, now);

  return {
    id: tender.id,
    number: tender.number,
    invitationId: invitation.id,
    ownerName,
    phase,
    startsAt: tender.startsAt,
    endsAt: tender.endsAt,
    currentRound: phase === "active" ? currentRound(tender, now) : null,
    roundCount: tender.roundCount,
    roundHours: tender.roundHours,
    items: items.map((item) => ({
      id: item.id,
      supplyName: item.supplyName,
      unit: item.unit,
      quantity: item.quantity,
      specs: item.specs,
      startingPrice: item.startingPrice,
      currentTarget: item.currentTarget,
      myLastPrice: latest.get(offerKey(invitation.id, item.id))?.unitPrice ?? null,
      myOffers: offers
        .filter((offer) => offer.itemId === item.id)
        .map((offer) => ({ round: offer.round, unitPrice: offer.unitPrice, createdAt: offer.createdAt })),
    })),
    negotiation:
      invitation.negotiationRequestedAt && invitation.negotiationContact
        ? { requestedAt: invitation.negotiationRequestedAt, contact: invitation.negotiationContact }
        : null,
    showThankYouNote: false,
  };
}

// ---------------------------------------------------------------------------
// Offers (RN-10, RN-12, RN-20)
// ---------------------------------------------------------------------------

// One submission of the supplier's offer form: one price per item it quotes
// (blank items are not quoted, RN-20). Every price is checked against the
// supplier's own last price for that item, or the starting price for a first
// offer (RN-10); if any fails, nothing is saved and each message goes under its
// item. The round is the one in force on the server clock (RN-12).
export async function submitOffersService(
  supplierUserId: VerifiedUserId,
  tenderId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<{ round: number; count: number }> {
  const { offers } = submitOffersInputSchema.parse(input);
  const { invitation, tender } = await getSupplierInvitation(supplierUserId, tenderId, db);

  const round = tenderPhase(tender, now) === "active" ? currentRound(tender, now) : null;
  if (round === null) throw new AppError("TENDER_NOT_ACTIVE");

  return db.transaction(async (tx) => {
    // Serializes this supplier's submissions for this tender, so two quick
    // submissions cannot both pass the "not above the last price" check.
    await tx
      .select({ id: tenderInvitations.id })
      .from(tenderInvitations)
      .where(eq(tenderInvitations.id, invitation.id))
      .for("update");

    const items = await tx
      .select({ id: tenderItems.id, startingPrice: tenderItems.startingPrice })
      .from(tenderItems)
      .where(eq(tenderItems.tenderId, tender.id));
    const itemById = new Map(items.map((item) => [item.id, item]));
    if (offers.some((offer) => !itemById.has(offer.itemId))) throw new AppError("TENDER_NOT_FOUND");

    const latest = latestOffers(await loadOffers(tender.id, tx, invitation.id));
    const fieldErrors: Record<string, string[]> = {};
    for (const offer of offers) {
      const item = itemById.get(offer.itemId)!;
      const lastPrice = latest.get(offerKey(invitation.id, item.id))?.unitPrice ?? null;
      const check = checkOffer(offer.unitPrice, { startingPrice: item.startingPrice, lastPrice });
      if (!check.ok) {
        fieldErrors[`price-${item.id}`] = [
          check.reason === "above_starting"
            ? offerAboveStartingMessage(formatARS(item.startingPrice))
            : offerAboveLastMessage(formatARS(lastPrice!)),
        ];
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new AppError("VALIDATION", { formErrors: [], fieldErrors });
    }

    await tx.insert(tenderOffers).values(
      offers.map((offer) => ({
        tenderItemId: offer.itemId,
        invitationId: invitation.id,
        round,
        unitPrice: offer.unitPrice,
        createdAt: now,
      })),
    );

    return { round, count: offers.length };
  });
}
