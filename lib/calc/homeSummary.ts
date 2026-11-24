// Readiness summary for the home page (P07): how far the account is from
// seeing the dashboard. Pure: it receives what the services already list and
// derives counts, the dashboard state and the pending tasks.

export type HomeSummaryInput = {
  supplies: readonly { kind: "supply" | "packaging" }[];
  products: readonly { variableCosts: unknown; variableCostsUnavailableCode: string | null }[];
  periodCostLineCount: number;
};

export type HomePendingTask =
  | { kind: "loadSupplies" }
  | { kind: "createFirstProduct" }
  | { kind: "completeRecipes"; count: number }
  | { kind: "reviewUnavailableCosts"; count: number }
  | { kind: "loadPeriodCosts" };

export type HomeSummary = {
  supplyCount: number;
  packagingCount: number;
  productCount: number;
  readyProductCount: number;
  hasPeriodCosts: boolean;
  dashboardStatus: "pending" | "inProgress";
  pendingTasks: HomePendingTask[];
  allReady: boolean;
};

export function buildHomeSummary({ supplies, products, periodCostLineCount }: HomeSummaryInput): HomeSummary {
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

  const pendingTasks: HomePendingTask[] = [];
  if (supplyCount === 0) pendingTasks.push({ kind: "loadSupplies" });
  if (productCount === 0) pendingTasks.push({ kind: "createFirstProduct" });
  if (recipePendingCount > 0) pendingTasks.push({ kind: "completeRecipes", count: recipePendingCount });
  if (unavailableCount > 0) pendingTasks.push({ kind: "reviewUnavailableCosts", count: unavailableCount });
  if (!hasPeriodCosts && productCount > 0) pendingTasks.push({ kind: "loadPeriodCosts" });

  const allProductsReady = productCount > 0 && readyProductCount === productCount;

  return {
    supplyCount,
    packagingCount,
    productCount,
    readyProductCount,
    hasPeriodCosts,
    // The dashboard never reads "ready": results are not built yet.
    dashboardStatus: allProductsReady ? "inProgress" : "pending",
    pendingTasks,
    allReady: pendingTasks.length === 0,
  };
}
