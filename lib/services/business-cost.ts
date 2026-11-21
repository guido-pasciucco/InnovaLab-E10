import "server-only";
import type { VerifiedUserId } from "./auth";

import { and, asc, eq } from "drizzle-orm";

import { businesses } from "@/lib/db/business/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { businessCostLines, type BusinessCostLine } from "@/lib/db/costs/table";
import {
  addPeriodCostLineInputSchema,
  listPeriodCostsOptionsSchema,
  updatePeriodCostLineAmountInputSchema,
  updatePeriodCostLineConceptInputSchema,
  type ListPeriodCostsOptions,
} from "@/lib/db/costs/validation";
import { uuidString } from "@/lib/db/formats";
import { AppError } from "@/lib/errors/app-error";
import { sumMoney } from "@/lib/money/sum";

import { getOrCreateDefaultBusiness } from "./calculations";

// Period expenses of the business catalog (#243). The user loads rent,
// utilities and similar costs once for the whole product list, after closing
// it. Every row belongs to a business and a month, so reopening the app (or
// another product calculation) reads the same set instead of loading it again.
//
// Owner scoping: the business is resolved from the caller's VerifiedUserId,
// and every read/write filters by that business. A foreign or missing line id
// surfaces as COST_CATALOG_LINE_NOT_FOUND.
//
// The story does not include prorating these expenses between products (#244)
// nor the selling price, so this service only stores and reads the period set.

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

export type PeriodCostLineList = {
  period: string;
  lines: BusinessCostLine[];
  total: string;
};

// The calculator is monthly and Argentina-oriented (ARS, "Mensual"), so the
// period key is the month in that timezone, not the server's UTC month.
export function currentPeriodKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Could not build the current period key");
  }

  return `${year}-${month}`;
}

function resolvePeriod(options: ListPeriodCostsOptions): string {
  return options.period ?? currentPeriodKey();
}

async function findBusinessId(
  userId: VerifiedUserId,
  db: Db,
): Promise<string | null> {
  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);

  return business?.id ?? null;
}

async function requireBusinessId(
  userId: VerifiedUserId,
  db: Db,
): Promise<string> {
  const businessId = await findBusinessId(userId, db);
  if (businessId === null) {
    throw new AppError("COST_CATALOG_LINE_NOT_FOUND");
  }
  return businessId;
}

// A line id comes from the client. A non-uuid, a missing row or another
// owner's row must look the same, and Postgres would otherwise reject a
// non-uuid with a 500.
export function requirePeriodCostLineId(lineId: string): string {
  const parsed = uuidString.safeParse(lineId);
  if (!parsed.success) {
    throw new AppError("COST_CATALOG_LINE_NOT_FOUND");
  }
  return parsed.data;
}

export async function listPeriodCostsService(
  userId: VerifiedUserId,
  opts: ListPeriodCostsOptions = {},
  db: Db = getDrizzleClient(),
): Promise<PeriodCostLineList> {
  const options = listPeriodCostsOptionsSchema.parse(opts);
  const period = resolvePeriod(options);
  const businessId = await findBusinessId(userId, db);

  if (businessId === null) {
    return { period, lines: [], total: sumMoney([]) };
  }

  // createdAt is the order the screen shows. id only breaks a tie, so two
  // lines saved in the same instant do not swap between reloads.
  const lines = await db
    .select()
    .from(businessCostLines)
    .where(
      and(
        eq(businessCostLines.businessId, businessId),
        eq(businessCostLines.period, period),
      ),
    )
    .orderBy(asc(businessCostLines.createdAt), asc(businessCostLines.id));

  return {
    period,
    lines,
    // The total is derived from the saved lines, so it survives a reload and
    // never depends on client state. Decimal keeps the cent (0.10 + 0.20).
    total: sumMoney(lines.map((line) => line.amountPeriod)),
  };
}

export async function addPeriodCostLineService(
  userId: VerifiedUserId,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<BusinessCostLine> {
  const line = addPeriodCostLineInputSchema.parse(input);
  const period = line.period ?? currentPeriodKey();

  return db.transaction(async (tx) => {
    const business = await getOrCreateDefaultBusiness(tx, userId);

    const [created] = await tx
      .insert(businessCostLines)
      .values({
        businessId: business.id,
        period,
        concept: line.concept,
        amountPeriod: line.amountPeriod,
        // A period expense (rent, utilities) is a fixed, indirect cost by
        // definition. The client never sends these dimensions.
        behavior: "fixed",
        traceability: "indirect",
      })
      .returning();

    return created;
  });
}

export async function updatePeriodCostLineAmountService(
  userId: VerifiedUserId,
  lineId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<BusinessCostLine> {
  const { amountPeriod } = updatePeriodCostLineAmountInputSchema.parse(input);
  const id = requirePeriodCostLineId(lineId);
  const businessId = await requireBusinessId(userId, db);

  const [updated] = await db
    .update(businessCostLines)
    .set({ amountPeriod })
    .where(
      and(
        eq(businessCostLines.id, id),
        eq(businessCostLines.businessId, businessId),
      ),
    )
    .returning();

  if (!updated) {
    throw new AppError("COST_CATALOG_LINE_NOT_FOUND");
  }

  return updated;
}

export async function updatePeriodCostLineConceptService(
  userId: VerifiedUserId,
  lineId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<BusinessCostLine> {
  const { concept } = updatePeriodCostLineConceptInputSchema.parse(input);
  const id = requirePeriodCostLineId(lineId);
  const businessId = await requireBusinessId(userId, db);

  const [updated] = await db
    .update(businessCostLines)
    .set({ concept })
    .where(
      and(
        eq(businessCostLines.id, id),
        eq(businessCostLines.businessId, businessId),
      ),
    )
    .returning();

  if (!updated) {
    throw new AppError("COST_CATALOG_LINE_NOT_FOUND");
  }

  return updated;
}

export async function removePeriodCostLineService(
  userId: VerifiedUserId,
  lineId: string,
  db: Db = getDrizzleClient(),
): Promise<BusinessCostLine> {
  const id = requirePeriodCostLineId(lineId);
  const businessId = await requireBusinessId(userId, db);

  const [removed] = await db
    .delete(businessCostLines)
    .where(
      and(
        eq(businessCostLines.id, id),
        eq(businessCostLines.businessId, businessId),
      ),
    )
    .returning();

  if (!removed) {
    throw new AppError("COST_CATALOG_LINE_NOT_FOUND");
  }

  return removed;
}
