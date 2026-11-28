import { describe, expect, it } from "vitest";

import { closureSnapshotSchema } from "./validation";

const validSnapshot = {
  period: "2026-11",
  inputs: {
    defaultMarkupPercent: "50.00",
    supplies: [{ id: "s1", name: "Harina", kind: "supply", unit: "kg", price: "1000.00" }],
    products: [
      {
        id: "p1",
        name: "Alfajor",
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
      totalExpenses: "30000.00",
      rows: [
        {
          rowId: "p1",
          productId: "p1",
          name: "Alfajor",
          variableUnit: "100.00",
          indirectUnit: "200.00",
          unitCost: "300.00",
        },
      ],
    },
    pricing: {
      defaultMarkupPercent: "50.00",
      rows: [
        {
          rowId: "p1",
          productId: "p1",
          name: "Alfajor",
          price: "450.00",
          profitUnit: "150.00",
          realMarginPct: "33.3333",
          ownMarkupPercent: null,
        },
      ],
    },
    breakEven: { rows: [], totals: null },
  },
};

describe("closureSnapshotSchema", () => {
  it("accepts a photo with every field the history view reads", () => {
    expect(closureSnapshotSchema.safeParse(validSnapshot).success).toBe(true);
  });

  it("rejects a photo whose pricing rows are missing", () => {
    const { pricing, ...results } = validSnapshot.results;
    void pricing;

    expect(closureSnapshotSchema.safeParse({ ...validSnapshot, results }).success).toBe(false);
  });

  it("rejects a photo where a stored money value is not a string", () => {
    const snapshot = {
      ...validSnapshot,
      inputs: {
        ...validSnapshot.inputs,
        supplies: [{ ...validSnapshot.inputs.supplies[0]!, price: 1000 }],
      },
    };

    expect(closureSnapshotSchema.safeParse(snapshot).success).toBe(false);
  });
});
