import { describe, expect, it } from "vitest";

import { buildSaleRows, type SaleRowProduct } from "./sale-rows";

function product(overrides: Partial<SaleRowProduct> = {}): SaleRowProduct {
  return {
    productId: "alfajor",
    productName: "Alfajor",
    productCapacity: 999,
    productMarkupPercent: "80.00",
    baseVariableUnit: "100",
    variableUnavailableCode: null,
    presentations: [],
    ...overrides,
  };
}

describe("buildSaleRows", () => {
  it("turns each presentation into its own row and ignores the product capacity", () => {
    const rows = buildSaleRows([
      product({
        presentations: [
          {
            id: "unit",
            name: "Unidad",
            capacity: 100,
            markupPercent: "50.00",
            variableUnit: "100",
          },
          {
            id: "box",
            name: "Caja x6",
            capacity: 50,
            markupPercent: null,
            variableUnit: "900",
          },
        ],
      }),
    ]);

    expect(rows).toEqual([
      {
        rowId: "unit",
        productId: "alfajor",
        presentationId: "unit",
        name: "Alfajor · Unidad",
        capacity: 100,
        ownMarkupPercent: "50.00",
        variableUnit: "100",
        variableUnavailableCode: null,
        editHref: "/products/alfajor/presentations",
      },
      {
        rowId: "box",
        productId: "alfajor",
        presentationId: "box",
        name: "Alfajor · Caja x6",
        capacity: 50,
        ownMarkupPercent: null,
        variableUnit: "900",
        variableUnavailableCode: null,
        editHref: "/products/alfajor/presentations",
      },
    ]);
  });

  it("keeps a product without presentations as one row", () => {
    const rows = buildSaleRows([
      product({
        productId: "budin",
        productName: "Budín",
        productCapacity: 20,
        productMarkupPercent: "30.00",
        baseVariableUnit: "500",
      }),
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        rowId: "budin",
        presentationId: null,
        name: "Budín",
        capacity: 20,
        ownMarkupPercent: "30.00",
        variableUnit: "500",
        editHref: "/products",
      }),
    ]);
  });

  it("keeps a presentation that has no capacity yet", () => {
    const rows = buildSaleRows([
      product({
        variableUnavailableCode: "MISSING_YIELD",
        baseVariableUnit: null,
        presentations: [
          {
            id: "box",
            name: "Caja x6",
            capacity: null,
            markupPercent: null,
            variableUnit: null,
          },
        ],
      }),
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        rowId: "box",
        name: "Alfajor · Caja x6",
        capacity: null,
        variableUnit: null,
        variableUnavailableCode: "MISSING_YIELD",
      }),
    ]);
  });
});
