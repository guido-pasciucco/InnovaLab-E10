import { describe, expect, it } from "vitest";

import { buildHomeSummary, type HomeSummaryInput } from "./homeSummary";

const ready = {
  variableCosts: { unit: "10" },
  variableCostsUnavailableCode: null,
  monthlyCapacity: 100,
};
const readyWithoutCapacity = { ...ready, monthlyCapacity: null };
const recipePending = {
  variableCosts: null,
  variableCostsUnavailableCode: null,
  monthlyCapacity: null,
};
const unpriceable = {
  variableCosts: null,
  variableCostsUnavailableCode: "UNSUPPORTED_RECIPE_UNIT",
  monthlyCapacity: 100,
};
const pricedRow = { unavailableCode: null };
const noMarkupRow = { unavailableCode: "NO_MARKUP" };
const noTotalCostRow = { unavailableCode: "NO_TOTAL_COST" };
const pendingBreakEven = { status: "no_prices" as const, totals: null };
const readyBreakEven = {
  status: "ready" as const,
  totals: { breakEvenSales: "1500000.00" },
};

const emptyAccount: HomeSummaryInput = {
  supplies: [],
  products: [],
  periodCostLineCount: 0,
  pricingRows: [],
  breakEven: pendingBreakEven,
};

describe("buildHomeSummary", () => {
  it("asks for supplies and a first product when the account is empty", () => {
    const summary = buildHomeSummary(emptyAccount);

    expect(summary.pendingTasks).toEqual([{ kind: "loadSupplies" }, { kind: "createFirstProduct" }]);
    expect(summary.breakEvenReady).toBe(false);
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
      ...emptyAccount,
      supplies: [{ kind: "supply" }],
      products: [ready, recipePending, recipePending, unpriceable],
      periodCostLineCount: 1,
    });

    expect(summary.pendingTasks).toEqual([
      { kind: "completeRecipes", count: 2 },
      { kind: "reviewUnavailableCosts", count: 1 },
    ]);
    expect(summary).toMatchObject({ productCount: 4, readyProductCount: 1, breakEvenReady: false });
  });

  it("asks for period costs when every product is ready but none were loaded", () => {
    const summary = buildHomeSummary({
      ...emptyAccount,
      supplies: [{ kind: "supply" }],
      products: [ready],
    });

    expect(summary.pendingTasks).toEqual([{ kind: "loadPeriodCosts" }]);
    expect(summary.breakEvenReady).toBe(false);
    expect(summary.hasPeriodCosts).toBe(false);
  });

  it("asks for the monthly capacity only of priced products that can enter the mix", () => {
    const summary = buildHomeSummary({
      ...emptyAccount,
      supplies: [{ kind: "supply" }],
      products: [readyWithoutCapacity, { ...ready, monthlyCapacity: 0 }, recipePending],
      periodCostLineCount: 1,
    });

    expect(summary.pendingTasks).toEqual([
      { kind: "completeRecipes", count: 1 },
      { kind: "loadCapacity", count: 2 },
    ]);
  });

  it("asks for the markup only of pricing rows missing it", () => {
    const summary = buildHomeSummary({
      ...emptyAccount,
      supplies: [{ kind: "supply" }],
      products: [ready],
      periodCostLineCount: 1,
      pricingRows: [noMarkupRow, pricedRow, noTotalCostRow, noMarkupRow],
    });

    expect(summary.pendingTasks).toEqual([{ kind: "loadMarkup", count: 2 }]);
  });

  it("asks to review the prices when the mix has no reachable break-even", () => {
    const summary = buildHomeSummary({
      ...emptyAccount,
      supplies: [{ kind: "supply" }],
      products: [ready],
      periodCostLineCount: 1,
      pricingRows: [pricedRow],
      breakEven: { status: "no_break_even", totals: null },
    });

    expect(summary.pendingTasks).toEqual([{ kind: "reviewPrices" }]);
  });

  it("keeps the old tasks before the new ones and only marks allReady without any", () => {
    const summary = buildHomeSummary({
      ...emptyAccount,
      supplies: [{ kind: "supply" }],
      products: [readyWithoutCapacity],
      pricingRows: [noMarkupRow],
    });

    expect(summary.pendingTasks).toEqual([
      { kind: "loadPeriodCosts" },
      { kind: "loadCapacity", count: 1 },
      { kind: "loadMarkup", count: 1 },
    ]);
    expect(summary.allReady).toBe(false);
  });

  it("shows the engine sales figure when the break-even is ready", () => {
    const summary = buildHomeSummary({
      ...emptyAccount,
      supplies: [{ kind: "supply" }],
      products: [ready],
      periodCostLineCount: 2,
      pricingRows: [pricedRow],
      breakEven: readyBreakEven,
    });

    expect(summary.pendingTasks).toEqual([]);
    expect(summary).toMatchObject({
      allReady: true,
      hasPeriodCosts: true,
      breakEvenReady: true,
      breakEvenSales: "1500000.00",
    });
  });

  it("does not show a sales figure for a non-ready break-even", () => {
    const summary = buildHomeSummary({
      ...emptyAccount,
      supplies: [{ kind: "supply" }],
      products: [ready],
      periodCostLineCount: 2,
      pricingRows: [pricedRow],
      breakEven: { status: "no_capacity", totals: null },
    });

    expect(summary).toMatchObject({ breakEvenReady: false, breakEvenSales: null });
  });
});
