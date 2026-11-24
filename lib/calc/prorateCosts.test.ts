import { describe, expect, it } from "vitest";

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
          share: "0.9000",
          variableUnit: "3200.00",
          indirectUnit: "1650.00",
          unitCost: "4850.00",
          fixedShare: "297000.00",
        },
        {
          productId: "factura",
          capacity: 20,
          share: "0.1000",
          variableUnit: "9800.00",
          indirectUnit: "1650.00",
          unitCost: "11450.00",
          fixedShare: "33000.00",
        },
      ],
    });
  });

  it("gives the product with the higher capacity the bigger absorption of pesos", () => {
    const result = calculateProration({
      lines: [{ id: "rent", amount: "300000.00" }],
      products: [
        { id: "pan", capacity: 180, variableUnit: "3200.00" },
        { id: "factura", capacity: 20, variableUnit: "9800.00" },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      costs: [
        { productId: "pan", fixedShare: "270000.00" },
        { productId: "factura", fixedShare: "30000.00" },
      ],
    });
  });

  it("assigns the whole period total to a single product", () => {
    // Mockup example: fixed 320.000, variable 2.500, 200 units -> unit cost of
    // 4.100.
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
          share: "1.0000",
          variableUnit: "2500.00",
          indirectUnit: "1600.00",
          unitCost: "4100.00",
          fixedShare: "320000.00",
        },
      ],
    });
  });

  it("rounds once from full precision, not from the rounded indirect share", () => {
    // 100 / 3 = 33.333... per unit; 0.004 + 33.3333... = 33.3373 -> 33.34, while
    // adding the already rounded 33.33 would give 33.334 -> 33.33.
    const result = calculateProration({
      lines: [{ id: "rent", amount: "100.00" }],
      products: [
        { id: "a", capacity: 1, variableUnit: "0.004" },
        { id: "b", capacity: 2, variableUnit: "0.00" },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      costs: [
        { productId: "a", indirectUnit: "33.33", unitCost: "33.34", fixedShare: "33.33" },
        { productId: "b", indirectUnit: "33.33", unitCost: "33.33", fixedShare: "66.67" },
      ],
    });
  });

  it("keeps the indirect share but gives no total cost to a product without variable cost", () => {
    const result = calculateProration({
      lines: [{ id: "rent", amount: "1000.00" }],
      products: [
        { id: "pan", capacity: 90, variableUnit: "10.00" },
        { id: "sin-receta", capacity: 10, variableUnit: null },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      costs: [
        { productId: "pan", unitCost: "20.00" },
        {
          productId: "sin-receta",
          variableUnit: null,
          indirectUnit: "10.00",
          unitCost: null,
          fixedShare: "100.00",
        },
      ],
    });
  });

  it("spreads nothing when there are no period expenses", () => {
    const result = calculateProration({
      lines: [],
      products: [{ id: "pan", capacity: 10, variableUnit: "10.00" }],
    });

    expect(result).toMatchObject({
      ok: true,
      costs: [{ indirectUnit: "0.00", unitCost: "10.00", fixedShare: "0.00" }],
    });
  });

  it("returns no capacity when there is no product to prorate over", () => {
    expect(calculateProration({ lines: [], products: [] })).toEqual({ ok: false, code: "NO_CAPACITY" });
  });

  it.each([0, -5, 1.5, Number.NaN, Number.MAX_VALUE])(
    "rejects a capacity that is not a positive safe integer (%s)",
    (capacity) => {
      const result = calculateProration({
        lines: [{ id: "rent", amount: "100.00" }],
        products: [{ id: "pan", capacity, variableUnit: "10.00" }],
      });

      expect(result).toEqual({ ok: false, code: "INVALID_CAPACITY" });
    },
  );

  it.each(["no-es-un-monto", "-1.00", "Infinity", ""])(
    "rejects an expense amount that is not a non-negative decimal (%s)",
    (amount) => {
      const result = calculateProration({
        lines: [{ id: "rent", amount }],
        products: [{ id: "pan", capacity: 10, variableUnit: "10.00" }],
      });

      expect(result).toEqual({ ok: false, code: "INVALID_AMOUNT" });
    },
  );

  it("rejects a variable unit cost that is negative", () => {
    const result = calculateProration({
      lines: [{ id: "rent", amount: "100.00" }],
      products: [{ id: "pan", capacity: 10, variableUnit: "-1.00" }],
    });

    expect(result).toEqual({ ok: false, code: "INVALID_AMOUNT" });
  });
});
