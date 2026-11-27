import { describe, expect, it } from "vitest";

import { latestAwards, orderTotals } from "./purchaseOrder";

describe("orderTotals (RN-15)", () => {
  it("multiplies quantity by unit price per line, in cents, and adds the lines", () => {
    expect(
      orderTotals([
        { quantity: "50.0000", unitPrice: "740.00" },
        { quantity: "2.5", unitPrice: "333.33" },
      ]),
    ).toEqual({ lines: ["37000.00", "833.33"], total: "37833.33" });
  });

  it("rounds each line half up", () => {
    // 0.125 × 10.00 = 1.25; 0.333 × 10.05 = 3.34665 → 3.35
    expect(orderTotals([{ quantity: "0.333", unitPrice: "10.05" }])).toEqual({ lines: ["3.35"], total: "3.35" });
  });
});

describe("latestAwards (RN-14)", () => {
  it("keeps the latest choice per item", () => {
    const awards = [
      { id: "1", itemId: "flour", supplierUserId: "a", unitPrice: "740.00", createdAt: new Date("2026-11-22T13:00:00Z") },
      { id: "2", itemId: "flour", supplierUserId: "b", unitPrice: "760.00", createdAt: new Date("2026-11-22T14:00:00Z") },
      { id: "3", itemId: "sugar", supplierUserId: "a", unitPrice: "900.00", createdAt: new Date("2026-11-22T13:00:00Z") },
    ];

    const latest = latestAwards(awards);
    expect(latest.get("flour")?.supplierUserId).toBe("b");
    expect(latest.get("sugar")?.supplierUserId).toBe("a");
  });
});
