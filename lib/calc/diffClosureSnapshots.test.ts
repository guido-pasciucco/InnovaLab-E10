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

const WHEN = "2026-11-24T18:40:00.000Z";

describe("diffClosureSnapshots", () => {
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
        { label: "Harina · precio", before: "1000.00", after: "2000.00", changedAt: WHEN },
        { label: "Alfajor · precio", before: "450.00", after: "600.00", changedAt: WHEN },
        {
          label: "Ventas de equilibrio",
          before: "38571.43",
          after: "45000.00",
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
        { label: "Harina · precio", before: "1000.00", after: "—", changedAt: WHEN },
        { label: "Azúcar · precio", before: "—", after: "1000.00", changedAt: WHEN },
      ]),
    );
    expect(changes.some((change) => change.label === "Recargo por defecto del negocio")).toBe(false);
  });

  it("returns no changes for identical snapshots", () => {
    expect(diffClosureSnapshots(snapshot(), snapshot(), WHEN)).toEqual([]);
  });
});
