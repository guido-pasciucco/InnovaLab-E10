import { describe, expect, it } from "vitest";

import { calculateCostTotals } from "./calculateCostTotals";
import { calculateProration } from "./prorateCosts";

// Issue #244: the period indirect costs are prorated over the catalog products
// by their monthly capacity. The reference spreadsheet of the #250 DATA case is
// not in the repo, so these fixtures prove the prorrateo formula only; they do
// not claim a cent-level match against that planilla.

describe("calculateProration", () => {
  it("prorrates the period fixed costs by capacity and adds the variable cost", () => {
    // 330.000 of indirect costs over 180 + 20 units: 1650 per unit absorbed by
    // each product, then the variable cost of each recipe on top.
    const result = calculateProration({
      lines: [
        { id: "rent", amount: "300000.00" },
        { id: "internet", amount: "30000.00" },
      ],
      products: [
        { id: "pan", capacity: 180, variableUnit: "3200.00" },
        { id: "factura", capacity: 20, variableUnit: "9800.00" },
      ],
    });

    expect(result).toEqual({
      ok: true,
      costs: [
        {
          productId: "pan",
          capacity: 180,
          variableUnit: "3200.00",
          indirectUnit: "1650.00",
          unitCost: "4850.00",
          fixedShare: "297000.00",
        },
        {
          productId: "factura",
          capacity: 20,
          variableUnit: "9800.00",
          indirectUnit: "1650.00",
          unitCost: "11450.00",
          fixedShare: "33000.00",
        },
      ],
    });
  });

  it("gives the product with the higher capacity the bigger absorption of the fixed costs", () => {
    const result = calculateProration({
      lines: [{ id: "rent", amount: "300000.00" }],
      products: [
        { id: "pan", capacity: 180, variableUnit: "3200.00" },
        { id: "factura", capacity: 20, variableUnit: "9800.00" },
      ],
    });

    expect(result).toEqual({
      ok: true,
      costs: [
        {
          productId: "pan",
          capacity: 180,
          variableUnit: "3200.00",
          indirectUnit: "1500.00",
          unitCost: "4700.00",
          fixedShare: "270000.00",
        },
        {
          productId: "factura",
          capacity: 20,
          variableUnit: "9800.00",
          indirectUnit: "1500.00",
          unitCost: "11300.00",
          fixedShare: "30000.00",
        },
      ],
    });
  });

  it("keeps the single-product unit cost equal to the period totals", () => {
    // Mockup example: fixed 320.000, variable 2.500, 200 units -> unit cost of
    // 4.100, the same figure the cost totals and the scenario comparisons use.
    const result = calculateProration({
      lines: [{ id: "rent", amount: "320000.00" }],
      products: [{ id: "pan", capacity: 200, variableUnit: "2500.00" }],
    });

    expect(result).toEqual({
      ok: true,
      costs: [
        {
          productId: "pan",
          capacity: 200,
          variableUnit: "2500.00",
          indirectUnit: "1600.00",
          unitCost: "4100.00",
          fixedShare: "320000.00",
        },
      ],
    });

    const totals = calculateCostTotals({
      volume: 200,
      lines: [
        {
          id: "rent",
          behavior: "fixed",
          traceability: "indirect",
          isOwnLabor: false,
          amount: "320000.00",
          yieldQuantity: "1",
        },
        {
          id: "flour",
          behavior: "variable",
          traceability: "direct",
          isOwnLabor: false,
          amount: "500000.00",
          yieldQuantity: "200",
        },
      ],
    });

    expect(totals.ok && totals.unitario).toBe("4100.00");
  });

  it("returns no capacity when there is no product to prorate over", () => {
    expect(calculateProration({ lines: [], products: [] })).toEqual({ ok: false, code: "NO_CAPACITY" });
  });

  it("rejects a capacity that is not a positive integer", () => {
    const result = calculateProration({
      lines: [{ id: "rent", amount: "100.00" }],
      products: [{ id: "pan", capacity: 0, variableUnit: "10.00" }],
    });

    expect(result).toEqual({ ok: false, code: "INVALID_CAPACITY" });
  });

  it("rejects an amount that is not a valid decimal", () => {
    const result = calculateProration({
      lines: [{ id: "rent", amount: "no-es-un-monto" }],
      products: [{ id: "pan", capacity: 10, variableUnit: "10.00" }],
    });

    expect(result).toEqual({ ok: false, code: "INVALID_AMOUNT" });
  });
});
