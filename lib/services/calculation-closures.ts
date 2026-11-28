import "server-only";
import type { VerifiedUserId } from "./auth";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { diffClosureSnapshots } from "@/lib/calc/diffClosureSnapshots";
import { businesses } from "@/lib/db/business/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { calcClosures, type CalcClosure } from "@/lib/db/closures/table";
import type { ListPeriodCostsOptions } from "@/lib/db/costs/validation";
import { AppError } from "@/lib/errors/app-error";
import type {
  ClosureChange,
  ClosureInputs,
  ClosurePresentation,
  ClosureProduct,
  ClosureSnapshot,
  ClosureSupply,
} from "@/lib/types/closure";
import { CLOSURE_SNAPSHOT_SCHEMA_VERSION } from "@/lib/types/closure";
import type { Pricing } from "@/lib/types/pricing";

import { currentPeriodKey, listPeriodCostsService } from "./business-cost";
import { getOrCreateDefaultBusiness } from "./calculations";
import { getBreakEvenService } from "./break-even";
import { getCostDistributionService } from "./cost-distribution";
import { listProductsService } from "./products";
import { getPricingService } from "./pricing";
import { getProductPresentationsService } from "./presentations";
import { listSuppliesService } from "./supplies";

// Monthly calculation closures (#322, D5-D8, D27, D50). Closing is a manual,
// append-only snapshot of everything the user sees plus the figures the live
// services return at that instant. Reading the history NEVER calls those
// services: it returns the stored snapshot, so catalog edits cannot rewrite the
// past. Every query is scoped to the business resolved from the session user.

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export type CloseCalculationOptions = {
  // Optional so tests can freeze the clock. It must be the current Argentina
  // month: a closed month never accepts another version.
  period?: string;
  now?: Date;
};

export type ClosureVersion = {
  version: number;
  closedAt: string;
};

export type CalculationClosureMonth = {
  period: string;
  lastClosedAt: string;
  versionCount: number;
  totalExpenses: string;
  breakEvenSales: string | null;
};

export type CalculationClosureDetail = {
  closure: CalcClosure;
  versions: ClosureVersion[];
  changes: ClosureChange[];
};

function parsePeriod(period: string): string {
  if (!PERIOD_PATTERN.test(period)) throw new AppError("CALC_CLOSURE_NOT_FOUND");
  return period;
}

async function findBusinessId(userId: VerifiedUserId, db: Db): Promise<string | null> {
  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);
  return business?.id ?? null;
}

async function buildInputs(
  userId: VerifiedUserId,
  period: string,
  pricing: Pricing,
  db: Db,
): Promise<ClosureInputs> {
  const [supplies, products, periodCosts] = await Promise.all([
    listSuppliesService(userId, db),
    listProductsService(userId, db),
    listPeriodCostsService(userId, { period }, db),
  ]);

  const supplyInputs: ClosureSupply[] = supplies.map((supply) => ({
    id: supply.id,
    name: supply.name,
    kind: supply.kind,
    unit: supply.purchaseUnit,
    price: supply.purchasePrice,
  }));

  const productInputs: ClosureProduct[] = [];
  for (const product of products) {
    const view = await getProductPresentationsService(userId, product.id, db);
    const presentations: ClosurePresentation[] = (view?.presentations ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      unitsPerPresentation: item.unitsPerPresentation,
      packaging: item.packaging.map((line) => ({
        supplyId: line.supplyId,
        supplyName: line.supplyName,
        quantity: line.quantity,
        unit: line.unit,
      })),
    }));

    productInputs.push({
      id: product.id,
      name: product.name,
      recipe: product.recipe.map((item) => ({
        supplyId: item.supplyId,
        supplyName: item.supplyName,
        quantity: item.quantity,
        unit: item.unit,
      })),
      yieldQuantity: product.yieldQuantity,
      monthlyCapacity: product.monthlyCapacity,
      ownMarkupPercent: null, // filled below from the pricing snapshot
      presentations,
    });
  }

  // Pricing already resolves the effective markup for every row. Keeping that
  // value in the photo makes the snapshot self-contained even if the business
  // default or the product override changes later.
  const ownMarkups = new Map(pricing.rows.map((row) => [row.productId, row.ownMarkupPercent]));
  for (const product of productInputs) {
    product.ownMarkupPercent = ownMarkups.get(product.id) ?? null;
  }

  return {
    supplies: supplyInputs,
    products: productInputs,
    periodCostLines: periodCosts.lines.map((line) => ({
      id: line.id,
      concept: line.concept,
      amountPeriod: line.amountPeriod,
    })),
    defaultMarkupPercent: pricing.defaultMarkupPercent,
  };
}

async function buildSnapshot(
  userId: VerifiedUserId,
  period: string,
  db: Db,
): Promise<ClosureSnapshot> {
  const options: ListPeriodCostsOptions = { period };
  const [costDistribution, pricing] = await Promise.all([
    getCostDistributionService(userId, options, db),
    getPricingService(userId, options, db),
  ]);
  const inputs = await buildInputs(userId, period, pricing, db);

  // Reuse the pricing already read above instead of recomputing it: the
  // injected reader only has to return it for this user.
  const breakEven = await getBreakEvenService(userId, {
    getPricing: async () => pricing,
  });

  return { period, inputs, results: { costDistribution, pricing, breakEven } };
}

/**
 * Saves the next version of the current month's photo.
 *
 * @throws AppError CALC_CLOSURE_PERIOD_CLOSED when `period` is not the current
 * Argentina month, CALC_CLOSURE_VERSION_CONFLICT on a concurrent insert.
 */
export async function closeCalculationService(
  userId: VerifiedUserId,
  opts: CloseCalculationOptions = {},
  db: Db = getDrizzleClient(),
): Promise<CalcClosure> {
  const now = opts.now ?? new Date();
  const currentPeriod = currentPeriodKey(now);
  const period = parsePeriod(opts.period ?? currentPeriod);
  if (period !== currentPeriod) throw new AppError("CALC_CLOSURE_PERIOD_CLOSED");

  // The read services take a full Db (they may open their own transactions), so
  // they run before the short write transaction that allocates the version.
  const business = await db.transaction((tx) => getOrCreateDefaultBusiness(tx, userId));
  const businessId = business.id;
  const snapshot = await buildSnapshot(userId, period, db);

  return db.transaction(async (tx) => {
    // Serializes version allocation for this month while allowing other months
    // and businesses to close in parallel.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`calc-closure:${businessId}:${period}`}, 0))`,
    );

    const [latest] = await tx
      .select({ value: sql<number>`coalesce(max(${calcClosures.version}), 0)::int` })
      .from(calcClosures)
      .where(and(eq(calcClosures.businessId, businessId), eq(calcClosures.period, period)));

    const [closure] = await tx
      .insert(calcClosures)
      .values({
        businessId,
        period,
        version: (latest?.value ?? 0) + 1,
        closedAt: now,
        snapshot,
        snapshotSchemaVersion: CLOSURE_SNAPSHOT_SCHEMA_VERSION,
      })
      .returning();

    return closure;
  });
}

/** Closed months of this user's business, newest first. Read-only. */
export async function listCalculationClosuresService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<CalculationClosureMonth[]> {
  const businessId = await findBusinessId(userId, db);
  if (businessId === null) return [];

  const rows = await db
    .select()
    .from(calcClosures)
    .where(eq(calcClosures.businessId, businessId))
    .orderBy(desc(calcClosures.period), asc(calcClosures.version));

  const byPeriod = new Map<string, CalcClosure[]>();
  for (const row of rows) {
    const group = byPeriod.get(row.period) ?? [];
    group.push(row);
    byPeriod.set(row.period, group);
  }

  return [...byPeriod.entries()].map(([period, versions]) => {
    const latest = versions[versions.length - 1]!;
    return {
      period,
      lastClosedAt: latest.closedAt.toISOString(),
      versionCount: versions.length,
      totalExpenses: latest.snapshot.results.costDistribution.totalExpenses,
      breakEvenSales: latest.snapshot.results.breakEven.totals?.breakEvenSales ?? null,
    };
  });
}

/** Latest closure of a period, for the "Último cierre" note in /equilibrio. */
export async function getLatestClosureService(
  userId: VerifiedUserId,
  opts: { period?: string; now?: Date } = {},
  db: Db = getDrizzleClient(),
): Promise<ClosureVersion | null> {
  const businessId = await findBusinessId(userId, db);
  if (businessId === null) return null;

  const period = parsePeriod(opts.period ?? currentPeriodKey(opts.now ?? new Date()));
  const [row] = await db
    .select({ version: calcClosures.version, closedAt: calcClosures.closedAt })
    .from(calcClosures)
    .where(and(eq(calcClosures.businessId, businessId), eq(calcClosures.period, period)))
    .orderBy(desc(calcClosures.version))
    .limit(1);

  return row ? { version: row.version, closedAt: row.closedAt.toISOString() } : null;
}

/**
 * One month's photo with its version list and the audit against the previous
 * version. Everything comes from the stored snapshots: no live calculation.
 *
 * @throws AppError CALC_CLOSURE_NOT_FOUND for a missing, foreign or invalid
 * period/version (all three look the same to the caller).
 */
export async function getCalculationClosureService(
  userId: VerifiedUserId,
  period: string,
  opts: { version?: number } = {},
  db: Db = getDrizzleClient(),
): Promise<CalculationClosureDetail> {
  const businessId = await findBusinessId(userId, db);
  if (businessId === null) throw new AppError("CALC_CLOSURE_NOT_FOUND");

  const rows = await db
    .select()
    .from(calcClosures)
    .where(and(eq(calcClosures.businessId, businessId), eq(calcClosures.period, parsePeriod(period))))
    .orderBy(asc(calcClosures.version));

  if (rows.length === 0) throw new AppError("CALC_CLOSURE_NOT_FOUND");

  const closure =
    opts.version === undefined
      ? rows[rows.length - 1]!
      : rows.find((row) => row.version === opts.version);
  if (!closure) throw new AppError("CALC_CLOSURE_NOT_FOUND");

  const previous = rows.find((row) => row.version === closure.version - 1);
  const changes = previous
    ? diffClosureSnapshots(
        previous.snapshot,
        closure.snapshot,
        closure.closedAt.toISOString(),
      )
    : [];

  return {
    closure,
    versions: rows.map((row) => ({
      version: row.version,
      closedAt: row.closedAt.toISOString(),
    })),
    changes,
  };
}
