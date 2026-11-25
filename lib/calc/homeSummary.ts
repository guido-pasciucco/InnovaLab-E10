// Readiness summary for the home page (P07, #319): how far the account is from
// reaching the break-even view. Pure: it receives what the services already
// read and derives counts, the break-even card and the pending tasks.

import type { BreakEvenStatus } from "@/lib/types/break-even";

export type HomeSummaryInput = {
  supplies: readonly { kind: "supply" | "packaging" }[];
  products: readonly { variableCosts: unknown; variableCostsUnavailableCode: string | null }[];
  periodCostLineCount: number;
  // One row per thing that is sold (#321): a product without presentations, or
  // each presentation of a product. Capacity is loaded per row, at editHref.
  pricingRows: readonly {
    unavailableCode: string | null;
    capacity: number | null;
    variableUnit: string | null;
    editHref: string;
  }[];
  breakEven: {
    status: BreakEvenStatus;
    totals: { breakEvenSales: string } | null;
  };
};

export type HomePendingTask =
  | { kind: "loadSupplies" }
  | { kind: "createFirstProduct" }
  | { kind: "completeRecipes"; count: number }
  | { kind: "reviewUnavailableCosts"; count: number }
  | { kind: "loadPeriodCosts" }
  | { kind: "loadCapacity"; count: number; href: string }
  | { kind: "loadMarkup"; count: number }
  | { kind: "reviewPrices" };

export type HomeSummary = {
  supplyCount: number;
  packagingCount: number;
  productCount: number;
  readyProductCount: number;
  hasPeriodCosts: boolean;
  // The card shows the engine's sales figure only when the mix is ready.
  breakEvenReady: boolean;
  breakEvenSales: string | null;
  pendingTasks: HomePendingTask[];
  allReady: boolean;
};

export function buildHomeSummary({
  supplies,
  products,
  periodCostLineCount,
  pricingRows,
  breakEven,
}: HomeSummaryInput): HomeSummary {
  const supplyCount = supplies.filter((supply) => supply.kind === "supply").length;
  const packagingCount = supplies.length - supplyCount;
  const productCount = products.length;
  const readyProductCount = products.filter((product) => product.variableCosts !== null).length;
  // A product without variable costs is either missing its recipe or yield
  // (no code) or has a recipe the cost engine cannot price (a code).
  const recipePendingCount = products.filter(
    (product) => product.variableCosts === null && product.variableCostsUnavailableCode === null,
  ).length;
  const unavailableCount = productCount - readyProductCount - recipePendingCount;
  const hasPeriodCosts = periodCostLineCount > 0;
  // Rows without a variable cost are already covered by "completeRecipes" or
  // "reviewUnavailableCosts"; only costed rows can enter the mix. A product with
  // presentations loads its capacity in each presentation, not in the product.
  const capacityPendingRows = pricingRows.filter(
    (row) => row.variableUnit !== null && (row.capacity === null || row.capacity === 0),
  );
  const capacityHrefs = new Set(capacityPendingRows.map((row) => row.editHref));
  const capacityHref = capacityHrefs.size === 1 ? [...capacityHrefs][0] : "/products";
  const markupPendingCount = pricingRows.filter((row) => row.unavailableCode === "NO_MARKUP").length;
  const breakEvenReady = breakEven.status === "ready" && breakEven.totals !== null;

  const pendingTasks: HomePendingTask[] = [];
  if (supplyCount === 0) pendingTasks.push({ kind: "loadSupplies" });
  if (productCount === 0) pendingTasks.push({ kind: "createFirstProduct" });
  if (recipePendingCount > 0) pendingTasks.push({ kind: "completeRecipes", count: recipePendingCount });
  if (unavailableCount > 0) pendingTasks.push({ kind: "reviewUnavailableCosts", count: unavailableCount });
  if (!hasPeriodCosts && productCount > 0) pendingTasks.push({ kind: "loadPeriodCosts" });
  if (capacityPendingRows.length > 0) {
    pendingTasks.push({ kind: "loadCapacity", count: capacityPendingRows.length, href: capacityHref });
  }
  if (markupPendingCount > 0) pendingTasks.push({ kind: "loadMarkup", count: markupPendingCount });
  if (breakEven.status === "no_break_even") pendingTasks.push({ kind: "reviewPrices" });

  return {
    supplyCount,
    packagingCount,
    productCount,
    readyProductCount,
    hasPeriodCosts,
    breakEvenReady,
    breakEvenSales: breakEvenReady ? breakEven.totals?.breakEvenSales ?? null : null,
    pendingTasks,
    allReady: pendingTasks.length === 0,
  };
}
