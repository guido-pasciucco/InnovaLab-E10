import { describe, expect, it } from "vitest";

import { referenceRows, referenceTotals } from "./reference-example";

describe("referenceBreakEven", () => {
  it("shows 42 whole units for the single presentation", () => {
    expect(referenceRows[0].wholeUnits).toBe("42");
  });

  it("shows 21 whole boxes for the box presentation", () => {
    expect(referenceRows[1].wholeUnits).toBe("21");
  });

  it("shows $ 52.758,62 of break-even sales", () => {
    expect(referenceTotals.breakEvenSales).toBe("$ 52.758,62");
  });

  it("closes the $ 30.000 monthly costs with the exact quotas", () => {
    expect(referenceTotals.closingContribution).toBe("$ 30.000,00");
  });

  it("matches the price and contribution of the worked example", () => {
    expect(referenceRows[0].price).toBe("$ 450,00");
    expect(referenceRows[0].contribution).toBe("$ 350,00");
    expect(referenceRows[1].price).toBe("$ 1.650,00");
    expect(referenceRows[1].contribution).toBe("$ 750,00");
  });
});
