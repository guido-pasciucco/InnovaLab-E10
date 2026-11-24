import { describe, expect, it } from "vitest";

import {
  calculatePortfolioBreakEven,
  type PortfolioInput,
} from "./calculatePortfolioBreakEven";

// Illustrative example for the break-even view (#246).
// It is NOT the DATA example (#250): it only pins the expected behavior.
//   period fixed costs: 150000.00
//   A: capacity 200, CVU 800, price 1400
//   B: capacity 100, CVU 500, price 900
//   C: capacity 300, CVU 1200, price 2000
const validInput: PortfolioInput = {
  periodFixedCosts: "150000.00",
  products: [
    { id: "a", name: "A", capacity: 200, variableUnit: "800", price: "1400" },
    { id: "b", name: "B", capacity: 100, variableUnit: "500", price: "900" },
    { id: "c", name: "C", capacity: 300, variableUnit: "1200", price: "2000" },
  ],
};

describe("calculatePortfolioBreakEven", () => {
  it("returns the illustrative catalog break-even", () => {
    const result = calculatePortfolioBreakEven(validInput);

    expect(result).toEqual({
      ok: true,
      products: [
        {
          id: "a",
          name: "A",
          capacity: 200,
          mixPct: "33.3333",
          variableUnit: "800.00",
          indirectUnit: "250.00",
          unitCost: "1050.00",
          fixedShare: "50000.00",
          price: "1400.00",
          contributionUnit: "600.00",
          marginPct: "25.0000",
          breakEvenUnits: "75.0000",
          breakEvenSales: "105000.00",
        },
        {
          id: "b",
          name: "B",
          capacity: 100,
          mixPct: "16.6667",
          variableUnit: "500.00",
          indirectUnit: "250.00",
          unitCost: "750.00",
          fixedShare: "25000.00",
          price: "900.00",
          contributionUnit: "400.00",
          marginPct: "16.6667",
          breakEvenUnits: "37.5000",
          breakEvenSales: "33750.00",
        },
        {
          id: "c",
          name: "C",
          capacity: 300,
          mixPct: "50.0000",
          variableUnit: "1200.00",
          indirectUnit: "250.00",
          unitCost: "1450.00",
          fixedShare: "75000.00",
          price: "2000.00",
          contributionUnit: "800.00",
          marginPct: "27.5000",
          breakEvenUnits: "112.5000",
          breakEvenSales: "225000.00",
        },
      ],
      totals: {
        capacity: 600,
        periodFixedCosts: "150000.00",
        indirectUnit: "250.00",
        weightedContribution: "666.6667",
        weightedPrice: "1616.6667",
        contributionRatio: "0.412371",
        breakEvenUnits: "225.0000",
        breakEvenUnitsWhole: "225",
        breakEvenSales: "363750.00",
        closingContribution: "150000.00",
      },
      excludedProductIds: [],
      hasNegativeContribution: false,
    });
  });

  it("reduces to the single-product break-even when there is one product", () => {
    // Contribution 200 - 60 = 140; units 1000 / 140 = 7.142857...;
    // sales 1000 / (140 / 200) = 1428.5714...
    const result = calculatePortfolioBreakEven({
      periodFixedCosts: "1000",
      products: [
        { id: "only", name: "Only", capacity: 10, variableUnit: "60", price: "200" },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totals.breakEvenUnits).toBe("7.1429");
    expect(result.totals.breakEvenUnitsWhole).toBe("8");
    expect(result.totals.breakEvenSales).toBe("1428.57");
    expect(result.products[0].contributionUnit).toBe("140.00");
  });

  it("keeps the closing check exact when the mix repeats decimals", () => {
    // 1/3 of the mix each: rounding the quota to 3.3333 and multiplying by
    // the price would close at 99.99 instead of 100.
    const result = calculatePortfolioBreakEven({
      periodFixedCosts: "100",
      products: [
        { id: "a", name: "A", capacity: 1, variableUnit: "0", price: "10" },
        { id: "b", name: "B", capacity: 1, variableUnit: "0", price: "10" },
        { id: "c", name: "C", capacity: 1, variableUnit: "0", price: "10" },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      totals: {
        breakEvenUnits: "10.0000",
        breakEvenSales: "100.00",
        closingContribution: "100.00",
      },
    });
    expect(result.ok && result.products.map((product) => product.breakEvenSales)).toEqual([
      "33.33",
      "33.33",
      "33.33",
    ]);
  });

  it("returns zero units and sales when there are no fixed costs", () => {
    const result = calculatePortfolioBreakEven({
      ...validInput,
      periodFixedCosts: "0",
    });

    expect(result).toMatchObject({
      ok: true,
      totals: {
        breakEvenUnits: "0.0000",
        breakEvenUnitsWhole: "0",
        breakEvenSales: "0.00",
        closingContribution: "0.00",
      },
    });
  });

  it("excludes products with capacity 0 without validating their price", () => {
    const result = calculatePortfolioBreakEven({
      periodFixedCosts: "1000",
      products: [
        { id: "empty", name: "Empty", capacity: 0, variableUnit: "", price: "" },
        { id: "only", name: "Only", capacity: 10, variableUnit: "60", price: "200" },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      excludedProductIds: ["empty"],
      totals: { capacity: 10, breakEvenUnits: "7.1429" },
    });
    expect(result.ok && result.products.map((product) => product.id)).toEqual(["only"]);
  });

  it("marks a product below its variable cost without aborting the mix", () => {
    const result = calculatePortfolioBreakEven({
      periodFixedCosts: "1000",
      products: [
        { id: "loss", name: "Loss", capacity: 50, variableUnit: "12", price: "10" },
        { id: "gain", name: "Gain", capacity: 50, variableUnit: "50", price: "100" },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      hasNegativeContribution: true,
      products: [{ contributionUnit: "-2.00" }, { contributionUnit: "50.00" }],
    });
  });

  it("returns NO_PRODUCTS when the catalog is empty", () => {
    const result = calculatePortfolioBreakEven({ ...validInput, products: [] });

    expect(result).toEqual({ ok: false, code: "NO_PRODUCTS" });
  });

  it("returns NO_CAPACITY when every capacity is 0", () => {
    const result = calculatePortfolioBreakEven({
      ...validInput,
      products: validInput.products.map((product) => ({ ...product, capacity: 0 })),
    });

    expect(result).toEqual({ ok: false, code: "NO_CAPACITY" });
  });

  it("returns NO_PRICE when a participating product has no price", () => {
    const result = calculatePortfolioBreakEven({
      ...validInput,
      products: [{ ...validInput.products[0], price: "" }],
    });

    expect(result).toEqual({ ok: false, code: "NO_PRICE" });
  });

  it.each(["0", "-1"])("returns NO_PRICE when the price is %s", (price) => {
    const result = calculatePortfolioBreakEven({
      ...validInput,
      products: [{ ...validInput.products[0], price }],
    });

    expect(result).toEqual({ ok: false, code: "NO_PRICE" });
  });

  it.each([
    {
      name: "every price equals the variable cost",
      products: [
        { id: "a", name: "A", capacity: 10, variableUnit: "10", price: "10" },
        { id: "b", name: "B", capacity: 10, variableUnit: "20", price: "20" },
      ],
    },
    {
      name: "every price is below the variable cost",
      products: [
        { id: "a", name: "A", capacity: 10, variableUnit: "11", price: "10" },
        { id: "b", name: "B", capacity: 10, variableUnit: "21", price: "20" },
      ],
    },
  ])("returns NO_CONTRIBUTION when $name", ({ products }) => {
    const result = calculatePortfolioBreakEven({
      periodFixedCosts: "1000",
      products,
    });

    expect(result).toEqual({ ok: false, code: "NO_CONTRIBUTION" });
  });

  it.each([1.5, -1, Number.NaN])(
    "returns INVALID_CAPACITY when a capacity is %j",
    (capacity) => {
      const result = calculatePortfolioBreakEven({
        ...validInput,
        products: [{ ...validInput.products[0], capacity }],
      });

      expect(result).toEqual({ ok: false, code: "INVALID_CAPACITY" });
    },
  );

  it.each([
    { field: "periodFixedCosts", value: "x" },
    { field: "periodFixedCosts", value: "-1" },
    { field: "periodFixedCosts", value: "Infinity" },
    { field: "variableUnit", value: "1,5" },
    { field: "variableUnit", value: "-0.01" },
    { field: "price", value: "abc" },
  ] as const)("returns INVALID_AMOUNT when $field is $value", ({ field, value }) => {
    const result = calculatePortfolioBreakEven(
      field === "periodFixedCosts"
        ? { ...validInput, [field]: value }
        : {
            ...validInput,
            products: [{ ...validInput.products[0], [field]: value }],
          },
    );

    expect(result).toEqual({ ok: false, code: "INVALID_AMOUNT" });
  });
});
