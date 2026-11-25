import "server-only";
import type { VerifiedUserId } from "./auth";

import Decimal from "decimal.js";
import { and, eq } from "drizzle-orm";

import { suggestPrice } from "@/lib/calc/suggestPrice";
import { businesses, products } from "@/lib/db/business/table";
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

type OwnMarkups = {
  defaultMarkupPercent: string | null;
  byProduct: Map<string, string | null>;
};

// Only the markup columns are read here. The products themselves (names,
// capacities and costs) come from getCostDistributionService, which already
// filters by the owner and does the proration.
async function getOwnMarkups(
  userId: VerifiedUserId,
  db: Db,
): Promise<OwnMarkups> {
  const [[business], rows] = await Promise.all([
    db
      .select({ defaultMarkupPercent: businesses.defaultMarkupPercent })
      .from(businesses)
      .where(eq(businesses.ownerUserId, userId))
      .limit(1),
    db
      .select({ id: products.id, markupPercent: products.markupPercent })
      .from(products)
      .innerJoin(businesses, eq(products.businessId, businesses.id))
      .where(and(eq(businesses.ownerUserId, userId), eq(products.isActive, true))),
  ]);

  return {
    defaultMarkupPercent: business?.defaultMarkupPercent ?? null,
    byProduct: new Map(rows.map((row) => [row.id, row.markupPercent])),
  };
}

export async function getPricingService(
  userId: VerifiedUserId,
  opts: ListPeriodCostsOptions = {},
  db: Db = getDrizzleClient(),
): Promise<Pricing> {
  const [distribution, markups] = await Promise.all([
    getCostDistributionService(userId, opts, db),
    getOwnMarkups(userId, db),
  ]);

  const rows: PricingRow[] = distribution.rows.map((row) => {
    const own = markups.byProduct.get(row.productId) ?? null;
    const markupPercent = own ?? markups.defaultMarkupPercent;
    const markupSource: MarkupSource =
      own !== null ? "product" : markups.defaultMarkupPercent !== null ? "business" : "none";

    const base = {
      productId: row.productId,
      name: row.name,
      capacity: row.capacity,
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
    defaultMarkupPercent: markups.defaultMarkupPercent,
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
