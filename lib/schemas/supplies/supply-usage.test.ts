import { describe, expect, it } from "vitest";

import { isSupplyUsageDetails } from "./supply-usage";

describe("isSupplyUsageDetails", () => {
  it("accepts recipe usages with the ingredient count", () => {
    const details = {
      usages: [
        {
          kind: "recipe",
          productId: "product-1",
          productName: "Torta",
          ingredientCount: 3,
          isActive: true,
        },
      ],
    };

    expect(isSupplyUsageDetails(details)).toBe(true);
  });

  it("accepts presentation usages", () => {
    const details = {
      usages: [
        {
          kind: "presentation",
          productId: "product-2",
          productName: "Alfajores",
          presentationId: "presentation-2",
          presentationName: "Caja x6",
          isActive: false,
        },
      ],
    };

    expect(isSupplyUsageDetails(details)).toBe(true);
  });

  it("accepts an empty usage list", () => {
    expect(isSupplyUsageDetails({ usages: [] })).toBe(true);
  });

  it("rejects values that are not usage details", () => {
    expect(isSupplyUsageDetails(null)).toBe(false);
    expect(isSupplyUsageDetails({})).toBe(false);
    expect(isSupplyUsageDetails("SUPPLY_IN_USE")).toBe(false);
  });

  it("rejects usages with a missing or unknown kind", () => {
    expect(isSupplyUsageDetails({ usages: [{ productName: "Torta" }] })).toBe(false);
    expect(
      isSupplyUsageDetails({
        usages: [{ kind: "otro", productId: "p", productName: "Torta" }],
      }),
    ).toBe(false);
  });

  it("rejects recipe usages without a valid ingredient count", () => {
    expect(
      isSupplyUsageDetails({
        usages: [
          { kind: "recipe", productId: "p", productName: "Torta", ingredientCount: 0 },
        ],
      }),
    ).toBe(false);
  });
});
