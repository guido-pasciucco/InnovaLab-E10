import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { supplies } from "@/lib/db/supplies/table";
import { tenderDrafts, type TenderDraftContent } from "@/lib/db/tenders/table";
import { tenderDraftInputSchema } from "@/lib/db/tenders/validation";
import { AppError } from "@/lib/errors/app-error";
import type { VerifiedUserId } from "@/lib/services/auth";

// Tender drafts: the emprendedor loads the supplies to publish and saves
// them, even before any supplier is registered, and publishes later. One
// draft per emprendedor; publishing deletes it (publishTenderService).

export type TenderDraft = TenderDraftContent;

type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export async function saveTenderDraftService(
  userId: VerifiedUserId,
  input: unknown,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<void> {
  const content: TenderDraftContent = tenderDraftInputSchema.parse(input);
  const supplyIds = content.items.map((item) => item.supplyId);

  const owned = await db
    .select({ id: supplies.id })
    .from(supplies)
    .where(and(eq(supplies.userId, userId), inArray(supplies.id, supplyIds)));
  if (owned.length !== supplyIds.length) throw new AppError("TENDER_SUPPLY_NOT_FOUND");

  await db
    .insert(tenderDrafts)
    .values({ ownerUserId: userId, content, updatedAt: now })
    .onConflictDoUpdate({ target: tenderDrafts.ownerUserId, set: { content, updatedAt: now } });
}

// The saved draft, without the supplies no longer in the catalog. A draft
// whose supplies were all deleted reads as no draft.
export async function loadTenderDraft(
  userId: VerifiedUserId,
  catalogIds: ReadonlySet<string>,
  db: DbOrTx,
): Promise<TenderDraft | null> {
  const [row] = await db.select().from(tenderDrafts).where(eq(tenderDrafts.ownerUserId, userId));
  if (!row) return null;
  const items = row.content.items.filter((item) => catalogIds.has(item.supplyId));
  if (items.length === 0) return null;
  return { ...row.content, items };
}

export async function hasTenderDraftService(userId: VerifiedUserId, db: Db = getDrizzleClient()): Promise<boolean> {
  const catalog = await db.select({ id: supplies.id }).from(supplies).where(eq(supplies.userId, userId));
  return (await loadTenderDraft(userId, new Set(catalog.map((supply) => supply.id)), db)) !== null;
}

export async function discardTenderDraftService(userId: VerifiedUserId, db: DbOrTx = getDrizzleClient()): Promise<void> {
  await db.delete(tenderDrafts).where(eq(tenderDrafts.ownerUserId, userId));
}
