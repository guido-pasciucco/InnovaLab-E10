import { describe, expect, it } from "vitest";

import { sumMoney } from "./sum";

describe("sumMoney", () => {
  it("returns 0.00 for an empty list", () => {
    expect(sumMoney([])).toBe("0.00");
  });

  it("keeps the cent when adding decimal strings", () => {
    expect(sumMoney(["0.10", "0.20"])).toBe("0.30");
  });

  it("rounds half up to two decimals", () => {
    expect(sumMoney(["0.005"])).toBe("0.01");
  });
});
