import "server-only";
import type { VerifiedUserId } from "./auth";

import Decimal from "decimal.js";
import { and, eq } from "drizzle-orm";

import { suggestPrice } from "@/lib/calc/suggestPrice";
import { businesses, presentations, products } from "@/lib/db/business/table";
import {
  setDefaultMarkupInputSchema,
  setProductMarkupInputSchema,
} from "@/lib/db/business/validation";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { uuidString } from "@/lib/db/formats";
import { AppError } from "@/lib/errors/app-error";
import type { ListPeriodCostsOptions } from "@/lib/db/costs/validation";
// The contract is shared with the break-even service (#247), which consumes
// this reader through GetPricing. Keeping it here avoids a parallel shape.
import type {
  MarkupSource,
  Pricing,
  PricingRow,
  PricingUnavailableCode,
} from "@/lib/types/pricing";

import { getOrCreateDefaultBusiness } from "./calculations";
import { getCostDistributionService } from "./cost-distribution";

// Suggested prices (#312, D28/D29). Nothing here is stored: the unit cost comes
// from getCostDistributionService (the single source of the proration) and the
// markup comes from the business default or the product override. Changing an
// input price, a capacity or a period expense changes the next read.

function money(value: string): string {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

async function getDefaultMarkup(userId: VerifiedUserId, db: Db): Promise<string | null> {
  const [business] = await db
    .select({ defaultMarkupPercent: businesses.defaultMarkupPercent })
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);

  return business?.defaultMarkupPercent ?? null;
}

export async function getPricingService(
  userId: VerifiedUserId,
  opts: ListPeriodCostsOptions = {},
  db: Db = getDrizzleClient(),
): Promise<Pricing> {
  const [distribution, defaultMarkupPercent] = await Promise.all([
    getCostDistributionService(userId, opts, db),
    getDefaultMarkup(userId, db),
  ]);

  const rows: PricingRow[] = distribution.rows.map((row) => {
    const own = row.ownMarkupPercent;
    const markupPercent = own ?? defaultMarkupPercent;
    const markupSource: MarkupSource =
      own !== null ? "product" : defaultMarkupPercent !== null ? "business" : "none";

    const base = {
      rowId: row.rowId,
      productId: row.productId,
      presentationId: row.presentationId,
      name: row.name,
      capacity: row.capacity,
      editHref: row.editHref,
      variableUnit: row.variableUnit,
      variableUnavailableCode: row.variableUnavailableCode,
      unitCost: row.unitCost,
      ownMarkupPercent: own,
      markupPercent,
      markupSource,
    };

    if (row.unitCost === null) {
      return {
        ...base,
        price: null,
        profitUnit: null,
        realMarginPct: null,
        unavailableCode: "NO_TOTAL_COST" as const,
      };
    }

    const priced = suggestPrice(row.unitCost, markupPercent);
    if (!priced.ok) {
      const unavailableCode: PricingUnavailableCode =
        priced.code === "INVALID_COST" ? "NO_TOTAL_COST" : "NO_MARKUP";
      return {
        ...base,
        price: null,
        profitUnit: null,
        realMarginPct: null,
        unavailableCode,
      };
    }

    return {
      ...base,
      price: money(priced.suggestedPrice),
      profitUnit: money(priced.profit),
      realMarginPct: new Decimal(priced.realMargin)
        .times(100)
        .toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
        .toFixed(4),
      unavailableCode: null,
    };
  });

  return {
    period: distribution.period,
    status: distribution.status,
    totalExpenses: distribution.totalExpenses,
    defaultMarkupPercent,
    rows,
  };
}

/** Saves the business default. A null input clears it. */
export async function saveDefaultMarkupPercentService(
  userId: VerifiedUserId,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<string | null> {
  const { defaultMarkupPercent } = setDefaultMarkupInputSchema.parse(input);

  return db.transaction(async (tx) => {
    const business = await getOrCreateDefaultBusiness(tx, userId);

    const [updated] = await tx
      .update(businesses)
      .set({ defaultMarkupPercent })
      .where(eq(businesses.id, business.id))
      .returning({ defaultMarkupPercent: businesses.defaultMarkupPercent });

    return updated?.defaultMarkupPercent ?? null;
  });
}

/**
 * Saves or clears (null) the product's own markup.
 * @throws AppError PRODUCT_NOT_FOUND when the id is invalid, foreign or inactive.
 */
export async function saveProductMarkupPercentService(
  userId: VerifiedUserId,
  productId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<string | null> {
  const { markupPercent } = setProductMarkupInputSchema.parse(input);
  const id = uuidString.safeParse(productId);
  if (!id.success) throw new AppError("PRODUCT_NOT_FOUND");

  const [owned] = await db
    .select({ id: products.id })
    .from(products)
    .innerJoin(businesses, eq(products.businessId, businesses.id))
    .where(
      and(
        eq(products.id, id.data),
        eq(businesses.ownerUserId, userId),
        eq(products.isActive, true),
      ),
    )
    .limit(1);

  if (!owned) throw new AppError("PRODUCT_NOT_FOUND");

  const [updated] = await db
    .update(products)
    .set({ markupPercent, updatedAt: new Date() })
    .where(eq(products.id, owned.id))
    .returning({ markupPercent: products.markupPercent });

  return updated?.markupPercent ?? null;
}

/**
 * Saves the markup of one sale row: the presentation when the row is one,
 * otherwise the product.
 * @throws AppError PRODUCT_NOT_FOUND when the row is invalid, foreign or inactive.
 */
export async function saveSaleRowMarkupPercentService(
  userId: VerifiedUserId,
  target: { productId: string; presentationId: string | null },
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<string | null> {
  if (!target.presentationId) {
    return saveProductMarkupPercentService(userId, target.productId, input, db);
  }

  const { markupPercent } = setProductMarkupInputSchema.parse(input);
  const presentationId = uuidString.safeParse(target.presentationId);
  const productId = uuidString.safeParse(target.productId);
  if (!presentationId.success || !productId.success) throw new AppError("PRODUCT_NOT_FOUND");

  const [owned] = await db
    .select({ id: presentations.id })
    .from(presentations)
    .innerJoin(products, eq(presentations.productId, products.id))
    .innerJoin(businesses, eq(products.businessId, businesses.id))
    .where(
      and(
        eq(presentations.id, presentationId.data),
        eq(products.id, productId.data),
        eq(businesses.ownerUserId, userId),
        eq(products.isActive, true),
      ),
    )
    .limit(1);

  if (!owned) throw new AppError("PRODUCT_NOT_FOUND");

  const [updated] = await db
    .update(presentations)
    .set({ markupPercent, updatedAt: new Date() })
    .where(eq(presentations.id, owned.id))
    .returning({ markupPercent: presentations.markupPercent });

  return updated?.markupPercent ?? null;
}
