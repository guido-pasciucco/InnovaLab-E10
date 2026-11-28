import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod/v4";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { profiles } from "@/lib/db/profile/table";
import { supplies } from "@/lib/db/supplies/table";
import { tenderDrafts, type TenderDraftContent } from "@/lib/db/tenders/table";
import { tenderDraftInputSchema } from "@/lib/db/tenders/validation";
import { AppError } from "@/lib/errors/app-error";
import type { VerifiedUserId } from "@/lib/services/auth";

// Tender drafts (N-31): the emprendedor can keep several half-filled publish
// forms and pick which one to continue from the tender list. Each one has a
// correlative number; saving the draft being edited updates it, saving a new
// form creates the next one. Publishing deletes only the chosen draft.

const draftIdSchema = z.uuid();

export type TenderDraft = TenderDraftContent & { id: string; number: number };
export type TenderDraftSummary = { id: string; number: number; itemCount: number; updatedAt: Date };

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

function toDraft(row: typeof tenderDrafts.$inferSelect): TenderDraft {
  return { id: row.id, number: row.number, ...row.content };
}

// A missing, foreign or malformed id reads as "not found": the same result
// for every case, so a caller cannot probe another emprendedor's drafts.
async function findOwned(userId: VerifiedUserId, draftId: string | null | undefined, db: DbOrTx) {
  const parsed = draftIdSchema.safeParse(draftId);
  if (!parsed.success) return null;
  const [row] = await db
    .select()
    .from(tenderDrafts)
    .where(and(eq(tenderDrafts.id, parsed.data), eq(tenderDrafts.ownerUserId, userId)))
    .limit(1);
  return row ?? null;
}

/**
 * @throws AppError TENDER_SUPPLY_NOT_FOUND, TENDER_DRAFT_NOT_FOUND
 */
export async function saveTenderDraftService(
  userId: VerifiedUserId,
  input: unknown,
  draftId: string | null,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<TenderDraft> {
  const content: TenderDraftContent = tenderDraftInputSchema.parse(input);
  const supplyIds = content.items.map((item) => item.supplyId);

  const owned = await db
    .select({ id: supplies.id })
    .from(supplies)
    .where(and(eq(supplies.userId, userId), inArray(supplies.id, supplyIds)));
  if (owned.length !== supplyIds.length) throw new AppError("TENDER_SUPPLY_NOT_FOUND");

  return db.transaction(async (tx) => {
    if (draftId) {
      const existing = await findOwned(userId, draftId, tx);
      if (!existing) throw new AppError("TENDER_DRAFT_NOT_FOUND");
      const [row] = await tx
        .update(tenderDrafts)
        .set({ content, updatedAt: now })
        .where(and(eq(tenderDrafts.id, draftId), eq(tenderDrafts.ownerUserId, userId)))
        .returning();
      if (!row) throw new AppError("TENDER_DRAFT_NOT_FOUND");
      return toDraft(row);
    }

    // Serializes saves of the same emprendedor so two drafts cannot get the
    // same number (N-31), the same way publishes serialize tender numbers.
    await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, userId)).for("update");
    const [last] = await tx
      .select({ number: sql<number | null>`max(${tenderDrafts.number})` })
      .from(tenderDrafts)
      .where(eq(tenderDrafts.ownerUserId, userId));
    const [row] = await tx
      .insert(tenderDrafts)
      .values({ ownerUserId: userId, number: Number(last?.number ?? 0) + 1, content, updatedAt: now })
      .returning();
    if (!row) throw new AppError("INTERNAL", { cause: "saveTenderDraftService: no row returned" });
    return toDraft(row);
  });
}

// The chosen draft without the supplies no longer in the catalog. A draft
// whose supplies were all deleted reads as no draft, as in the list.
export async function loadTenderDraft(
  userId: VerifiedUserId,
  draftId: string | null | undefined,
  catalogIds: ReadonlySet<string>,
  db: DbOrTx,
): Promise<TenderDraft | null> {
  const row = await findOwned(userId, draftId, db);
  if (!row) return null;
  const items = row.content.items.filter((item) => catalogIds.has(item.supplyId));
  if (items.length === 0) return null;
  return { ...toDraft(row), items };
}

// Summaries for the "Borradores" section of /licitaciones, newest first.
export async function listTenderDraftsService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<TenderDraftSummary[]> {
  const [rows, catalog] = await Promise.all([
    db
      .select()
      .from(tenderDrafts)
      .where(eq(tenderDrafts.ownerUserId, userId))
      .orderBy(desc(tenderDrafts.number)),
    db.select({ id: supplies.id }).from(supplies).where(eq(supplies.userId, userId)),
  ]);
  const catalogIds = new Set(catalog.map((supply) => supply.id));

  return rows.flatMap((row) => {
    const items = row.content.items.filter((item) => catalogIds.has(item.supplyId));
    return items.length === 0
      ? []
      : [{ id: row.id, number: row.number, itemCount: items.length, updatedAt: row.updatedAt }];
  });
}

/**
 * @throws AppError TENDER_DRAFT_NOT_FOUND
 */
export async function discardTenderDraftService(
  userId: VerifiedUserId,
  draftId: string,
  db: DbOrTx = getDrizzleClient(),
): Promise<void> {
  const parsed = draftIdSchema.safeParse(draftId);
  if (!parsed.success) throw new AppError("TENDER_DRAFT_NOT_FOUND");
  const deleted = await db
    .delete(tenderDrafts)
    .where(and(eq(tenderDrafts.id, parsed.data), eq(tenderDrafts.ownerUserId, userId)))
    .returning({ id: tenderDrafts.id });
  if (deleted.length === 0) throw new AppError("TENDER_DRAFT_NOT_FOUND");
}
