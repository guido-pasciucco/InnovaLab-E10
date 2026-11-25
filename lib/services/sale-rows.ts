import "server-only";
import type { VerifiedUserId } from "./auth";

import Decimal from "decimal.js";
import { eq, inArray } from "drizzle-orm";

import {
  presentationPackaging,
  presentations,
  products,
} from "@/lib/db/business/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { supplies } from "@/lib/db/supplies/table";
import type { ProductItem } from "@/lib/schemas/products/products";

import { deriveProductVariableCosts, listProductsService, toFormQuantity } from "./products";

// One row per thing the business sells (#321, D45). A product with
// presentations becomes one row per presentation ("Alfajor · Caja x6"); a
// product without them stays a single row in its base unit. Cost distribution,
// pricing and break-even all read this list instead of the product catalog.

export type SaleRow = {
  rowId: string;
  productId: string;
  presentationId: string | null;
  name: string;
  capacity: number | null;
  ownMarkupPercent: string | null;
  // Exact variable cost of the row, as a decimal string with no display
  // rounding. Null when the recipe or the presentation cannot be costed.
  variableUnit: string | null;
  variableUnavailableCode: ProductItem["variableCostsUnavailableCode"];
  // Where the row's capacity is loaded.
  editHref: string;
};

export type SaleRowPresentation = {
  id: string;
  name: string;
  capacity: number | null;
  markupPercent: string | null;
  variableUnit: string | null;
};

export type SaleRowProduct = {
  productId: string;
  productName: string;
  productCapacity: number | null;
  productMarkupPercent: string | null;
  baseVariableUnit: string | null;
  variableUnavailableCode: ProductItem["variableCostsUnavailableCode"];
  presentations: readonly SaleRowPresentation[];
};

function exactDecimal(
  fraction: { numerator: string; denominator: string } | null | undefined,
): string | null {
  if (!fraction) return null;
  return new Decimal(fraction.numerator).div(fraction.denominator).toString();
}

export function buildSaleRows(catalog: readonly SaleRowProduct[]): SaleRow[] {
  const rows: SaleRow[] = [];

  for (const product of catalog) {
    if (product.presentations.length === 0) {
      rows.push({
        rowId: product.productId,
        productId: product.productId,
        presentationId: null,
        name: product.productName,
        capacity: product.productCapacity,
        ownMarkupPercent: product.productMarkupPercent,
        variableUnit: product.baseVariableUnit,
        variableUnavailableCode:
          product.baseVariableUnit === null ? product.variableUnavailableCode : null,
        editHref: "/products",
      });
      continue;
    }

    for (const presentation of product.presentations) {
      rows.push({
        rowId: presentation.id,
        productId: product.productId,
        presentationId: presentation.id,
        name: `${product.productName} · ${presentation.name}`,
        capacity: presentation.capacity,
        ownMarkupPercent: presentation.markupPercent,
        variableUnit: presentation.variableUnit,
        variableUnavailableCode:
          presentation.variableUnit === null ? product.variableUnavailableCode : null,
        editHref: `/products/${product.productId}/presentations`,
      });
    }
  }

  return rows;
}

export async function listSaleRowsService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<SaleRow[]> {
  const catalog = await listProductsService(userId, db);
  if (catalog.length === 0) return [];

  const productIds = catalog.map((product) => product.id);
  const [presentationRows, markupRows, supplyRows] = await Promise.all([
    db
      .select()
      .from(presentations)
      .where(inArray(presentations.productId, productIds))
      .orderBy(presentations.createdAt, presentations.id),
    db
      .select({ id: products.id, markupPercent: products.markupPercent })
      .from(products)
      .where(inArray(products.id, productIds)),
    db.select().from(supplies).where(eq(supplies.userId, userId)),
  ]);

  const presentationIds = presentationRows.map((row) => row.id);
  const packagingLines =
    presentationIds.length === 0
      ? []
      : await db
          .select()
          .from(presentationPackaging)
          .where(inArray(presentationPackaging.presentationId, presentationIds))
          .orderBy(presentationPackaging.createdAt, presentationPackaging.id);

  const packagingByPresentation = new Map<
    string,
    { supplyId: string; quantity: string; unit: string }[]
  >();
  for (const line of packagingLines) {
    const list = packagingByPresentation.get(line.presentationId) ?? [];
    list.push({
      supplyId: line.supplyId,
      quantity: toFormQuantity(line.quantity),
      unit: line.unit,
    });
    packagingByPresentation.set(line.presentationId, list);
  }

  const presentationsByProduct = new Map<string, typeof presentationRows>();
  for (const row of presentationRows) {
    const list = presentationsByProduct.get(row.productId) ?? [];
    list.push(row);
    presentationsByProduct.set(row.productId, list);
  }

  const markupByProduct = new Map(markupRows.map((row) => [row.id, row.markupPercent]));

  const drafts: SaleRowProduct[] = catalog.map((product) => {
    const owned = presentationsByProduct.get(product.id) ?? [];
    const forCost = owned.map((row) => ({
      id: row.id,
      name: row.name,
      unitsPerPresentation: toFormQuantity(row.unitsPerPresentation),
      packaging: packagingByPresentation.get(row.id) ?? [],
    }));
    const costs = deriveProductVariableCosts(product, supplyRows, forCost);
    const byId = new Map(
      (costs.variableCosts?.presentations ?? []).map((presentation) => [
        presentation.id,
        presentation,
      ]),
    );

    return {
      productId: product.id,
      productName: product.name,
      productCapacity: product.monthlyCapacity,
      productMarkupPercent: markupByProduct.get(product.id) ?? null,
      baseVariableUnit: exactDecimal(costs.variableCosts?.exact.unitCost),
      variableUnavailableCode: costs.variableCostsUnavailableCode,
      presentations: owned.map((row) => ({
        id: row.id,
        name: row.name,
        capacity: row.monthlyCapacity,
        markupPercent: row.markupPercent,
        variableUnit: exactDecimal(byId.get(row.id)?.exact.totalCost),
      })),
    };
  });

  return buildSaleRows(drafts);
}
