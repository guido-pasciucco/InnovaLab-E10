import { describe, expect, it } from "vitest";

import { buildHomeSummary, type HomeSummaryInput } from "./homeSummary";

const ready = { variableCosts: { unit: "10" }, variableCostsUnavailableCode: null };
const recipePending = { variableCosts: null, variableCostsUnavailableCode: null };
const unpriceable = { variableCosts: null, variableCostsUnavailableCode: "UNSUPPORTED_RECIPE_UNIT" };

const emptyAccount: HomeSummaryInput = { supplies: [], products: [], periodCostLineCount: 0 };

describe("buildHomeSummary", () => {
  it("asks for supplies and a first product when the account is empty", () => {
    const summary = buildHomeSummary(emptyAccount);

    expect(summary.pendingTasks).toEqual([{ kind: "loadSupplies" }, { kind: "createFirstProduct" }]);
    expect(summary.dashboardStatus).toBe("pending");
    expect(summary.allReady).toBe(false);
  });

  it("counts supplies and packaging apart when the catalog has both kinds", () => {
    const summary = buildHomeSummary({
      ...emptyAccount,
      supplies: [{ kind: "supply" }, { kind: "supply" }, { kind: "packaging" }],
    });

    expect(summary).toMatchObject({ supplyCount: 2, packagingCount: 1 });
  });

  it("asks to complete recipes only for products missing their recipe or yield", () => {
    const summary = buildHomeSummary({
      supplies: [{ kind: "supply" }],
      products: [ready, recipePending, recipePending, unpriceable],
      periodCostLineCount: 1,
    });

    expect(summary.pendingTasks).toEqual([
      { kind: "completeRecipes", count: 2 },
      { kind: "reviewUnavailableCosts", count: 1 },
    ]);
    expect(summary).toMatchObject({ productCount: 4, readyProductCount: 1, dashboardStatus: "pending" });
  });

  it("asks for period costs when every product is ready but none were loaded", () => {
    const summary = buildHomeSummary({ supplies: [{ kind: "supply" }], products: [ready], periodCostLineCount: 0 });

    expect(summary.pendingTasks).toEqual([{ kind: "loadPeriodCosts" }]);
    expect(summary.dashboardStatus).toBe("inProgress");
    expect(summary.hasPeriodCosts).toBe(false);
  });

  it("is all ready when supplies, priced products and period costs are loaded", () => {
    const summary = buildHomeSummary({ supplies: [{ kind: "supply" }], products: [ready], periodCostLineCount: 2 });

    expect(summary.pendingTasks).toEqual([]);
    expect(summary).toMatchObject({ allReady: true, hasPeriodCosts: true, dashboardStatus: "inProgress" });
  });
});
