import { describe, expect, it } from "vitest";

import type { ClosureSnapshot } from "@/lib/types/closure";

import { diffClosureSnapshots, flattenClosureSnapshot } from "./diffClosureSnapshots";

function snapshot(overrides: {
  price?: string;
  supplyId?: string;
  supplyName?: string;
  productName?: string;
  priceOfProduct?: string;
  breakEvenSales?: string;
} = {}): ClosureSnapshot {
  const supplyId = overrides.supplyId ?? "harina";
  const productId = "alfajor";

  return {
    period: "2026-11",
    inputs: {
      defaultMarkupPercent: "50.00",
      supplies: [
        {
          id: supplyId,
          name: overrides.supplyName ?? "Harina",
          kind: "supply",
          unit: "kg",
          price: overrides.price ?? "1000.00",
        },
      ],
      products: [
        {
          id: productId,
          name: overrides.productName ?? "Alfajor",
          recipe: [],
          yieldQuantity: "10",
          monthlyCapacity: 150,
          ownMarkupPercent: null,
          presentations: [],
        },
      ],
      periodCostLines: [],
    },
    results: {
      costDistribution: {
        period: "2026-11",
        status: "ready",
        totalExpenses: "30000.00",
        rows: [
          {
            rowId: productId,
            productId,
            presentationId: null,
            name: overrides.productName ?? "Alfajor",
            capacity: 150,
            ownMarkupPercent: null,
            editHref: "/products",
            absorbsExpenses: true,
            share: "1.0000",
            variableUnit: "100.00",
            variableUnavailableCode: null,
            indirectUnit: "200.00",
            fixedShare: "30000.00",
            unitCost: "300.00",
          },
        ],
      },
      pricing: {
        period: "2026-11",
        status: "ready",
        totalExpenses: "30000.00",
        defaultMarkupPercent: "50.00",
        rows: [
          {
            rowId: productId,
            productId,
            presentationId: null,
            name: overrides.productName ?? "Alfajor",
            capacity: 150,
            editHref: "/products",
            variableUnit: "100.00",
            variableUnavailableCode: null,
            unitCost: "300.00",
            ownMarkupPercent: null,
            markupPercent: "50.00",
            markupSource: "business",
            price: overrides.priceOfProduct ?? "450.00",
            profitUnit: "150.00",
            realMarginPct: "33.3333",
            unavailableCode: null,
          },
        ],
      },
      breakEven: {
        period: "2026-11",
        status: "ready",
        totalExpenses: "30000.00",
        rows: [],
        totals: {
          capacity: 150,
          periodFixedCosts: "30000.00",
          indirectUnit: "200.00",
          weightedContribution: "350.0000",
          weightedPrice: "450.0000",
          contributionRatio: "0.777778",
          breakEvenUnits: "85.7143",
          breakEvenUnitsWhole: "86",
          breakEvenSales: overrides.breakEvenSales ?? "38571.43",
          closingContribution: "30000.00",
        },
        excluded: [],
        hasNegativeContribution: false,
      },
    },
  };
}

// After #321 a product with presentations produces one result row per
// presentation. All rows keep the same productId; only rowId is unique.
function withPresentations(prices: [string, string], variableUnits: [string, string]): ClosureSnapshot {
  const base = snapshot();
  const costRow = base.results.costDistribution.rows[0];
  const priceRow = base.results.pricing.rows[0];

  return {
    ...base,
    results: {
      ...base.results,
      costDistribution: {
        ...base.results.costDistribution,
        rows: [
          { ...costRow, rowId: "caja", presentationId: "caja", name: "Alfajor · Caja x6", variableUnit: variableUnits[0] },
          { ...costRow, rowId: "bolsa", presentationId: "bolsa", name: "Alfajor · Bolsa x1", variableUnit: variableUnits[1] },
        ],
      },
      pricing: {
        ...base.results.pricing,
        rows: [
          { ...priceRow, rowId: "caja", presentationId: "caja", name: "Alfajor · Caja x6", price: prices[0] },
          { ...priceRow, rowId: "bolsa", presentationId: "bolsa", name: "Alfajor · Bolsa x1", price: prices[1] },
        ],
      },
    },
  };
}

function withPresentationMarkups(markups: [string | null, string | null]): ClosureSnapshot {
  const base = snapshot();

  return {
    ...base,
    inputs: {
      ...base.inputs,
      products: base.inputs.products.map((product) => ({
        ...product,
        presentations: [
          { id: "caja", name: "Caja x6", unitsPerPresentation: "6", ownMarkupPercent: markups[0], packaging: [] },
          { id: "bolsa", name: "Bolsa x1", unitsPerPresentation: "1", ownMarkupPercent: markups[1], packaging: [] },
        ],
      })),
    },
  };
}

const WHEN = "2026-11-24T18:40:00.000Z";

describe("diffClosureSnapshots", () => {
  it("audits the markup of each presentation separately", () => {
    const changes = diffClosureSnapshots(
      withPresentationMarkups(["30.00", "40.00"]),
      withPresentationMarkups(["35.00", "40.00"]),
      WHEN,
    );

    expect(changes).toEqual([
      {
        key: "product:alfajor:presentation:caja:markup",
        label: "Alfajor · Caja x6 · recargo propio",
        before: "30.00",
        after: "35.00",
        kind: "percent",
        changedAt: WHEN,
      },
    ]);
  });

  it("tags presentation quantities as counts instead of money", () => {
    const before = withPresentationMarkups(["30.00", "40.00"]);
    const after = withPresentationMarkups(["30.00", "40.00"]);
    after.inputs.products[0]!.presentations[0]!.unitsPerPresentation = "12";

    const changes = diffClosureSnapshots(before, after, WHEN);

    expect(changes).toEqual([
      {
        key: "product:alfajor:presentation:caja:units",
        label: "Alfajor · Caja x6 · unidades por presentación",
        before: "6",
        after: "12",
        kind: "count",
        changedAt: WHEN,
      },
    ]);
  });

  it("audits every presentation row even when they share a productId", () => {
    const changes = diffClosureSnapshots(
      withPresentations(["100.00", "200.00"], ["100.00", "200.00"]),
      withPresentations(["150.00", "200.00"], ["110.00", "200.00"]),
      WHEN,
    );

    expect(changes).toEqual(
      expect.arrayContaining([
        {
          key: "result:pricing:caja:price",
          label: "Alfajor · Caja x6 · precio",
          before: "100.00",
          after: "150.00",
          kind: "money",
          changedAt: WHEN,
        },
        {
          key: "result:cost:caja:variableUnit",
          label: "Alfajor · Caja x6 · costo variable",
          before: "100.00",
          after: "110.00",
          kind: "money",
          changedAt: WHEN,
        },
      ]),
    );
    expect(changes.some((change) => change.label.startsWith("Alfajor · Bolsa x1 ·"))).toBe(false);
  });

  it("uses ids as keys so an unrelated rename does not reshuffle the table", () => {
    expect(flattenClosureSnapshot(snapshot()).has("supply:harina:price")).toBe(true);
  });

  it("reports changed fields with the date of the newer version", () => {
    const changes = diffClosureSnapshots(
      snapshot(),
      snapshot({ price: "2000.00", priceOfProduct: "600.00", breakEvenSales: "45000.00" }),
      WHEN,
    );

    expect(changes).toEqual(
      expect.arrayContaining([
        {
          key: "supply:harina:price",
          label: "Harina · precio",
          before: "1000.00",
          after: "2000.00",
          kind: "money",
          changedAt: WHEN,
        },
        {
          key: "result:pricing:alfajor:price",
          label: "Alfajor · precio",
          before: "450.00",
          after: "600.00",
          kind: "money",
          changedAt: WHEN,
        },
        {
          key: "result:breakEvenSales",
          label: "Ventas de equilibrio",
          before: "38571.43",
          after: "45000.00",
          kind: "money",
          changedAt: WHEN,
        },
      ]),
    );
    expect(changes.every((change) => change.changedAt === WHEN)).toBe(true);
  });

  it("reports added and removed fields without losing the rest", () => {
    const changes = diffClosureSnapshots(
      snapshot(),
      snapshot({ supplyId: "azucar", supplyName: "Azúcar", productName: "Budín" }),
      WHEN,
    );

    expect(changes).toEqual(
      expect.arrayContaining([
        {
          key: "supply:harina:price",
          label: "Harina · precio",
          before: "1000.00",
          after: "—",
          kind: "money",
          changedAt: WHEN,
        },
        {
          key: "supply:azucar:price",
          label: "Azúcar · precio",
          before: "—",
          after: "1000.00",
          kind: "money",
          changedAt: WHEN,
        },
      ]),
    );
    expect(changes.some((change) => change.label === "Recargo por defecto del negocio")).toBe(false);
  });

  it("returns no changes for identical snapshots", () => {
    expect(diffClosureSnapshots(snapshot(), snapshot(), WHEN)).toEqual([]);
  });
});
