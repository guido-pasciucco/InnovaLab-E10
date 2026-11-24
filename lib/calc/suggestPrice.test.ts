import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { suggestPrice } from "./suggestPrice";

describe("suggestPrice", () => {
  it("derives price, profit and real margin from cost and markup", () => {
    const result = suggestPrice("7000", "30");

    expect(result).toMatchObject({
      ok: true,
      suggestedPrice: "9100",
      profit: "2100",
    });
    if (!result.ok) throw new Error("expected a price");

    expect(
      new Decimal(result.realMargin).times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
    ).toBe("23.08");
  });

  // Validation example from issue #312: steps 1 to 3 (steps 4 and 5 are the
  // INVALID_MARKUP and NO_MARKUP cases below).
  it.each([
    ["step 1, product A (business 30 %)", "7000", "30", "9100", "2100", "23.08"],
    ["step 1, product B (own 50 %)", "1000", "50", "1500", "500", "33.33"],
    ["step 2, product A (business 40 %)", "7000", "40", "9800", "2800", "28.57"],
    ["step 3, product B (back to business 40 %)", "1000", "40", "1400", "400", "28.57"],
  ])("%s", (_step, cost, markup, price, profit, marginPct) => {
    const result = suggestPrice(cost, markup);
    if (!result.ok) throw new Error("expected a price");

    expect(result.suggestedPrice).toBe(price);
    expect(result.profit).toBe(profit);
    expect(
      new Decimal(result.realMargin).times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
    ).toBe(marginPct);
  });

  it("keeps exact decimals until display time", () => {
    const result = suggestPrice("1390.63", "30");

    expect(result).toMatchObject({
      ok: true,
      suggestedPrice: "1807.819",
      profit: "417.189",
    });
  });

  it("accepts a markup with decimal places", () => {
    expect(suggestPrice("1000.00", "12.5")).toMatchObject({
      ok: true,
      suggestedPrice: "1125",
      profit: "125",
    });
  });

  it.each(["0", "-5", "abc", "1e3"])(
    "returns INVALID_MARKUP for the markup %j",
    (markup) => {
      expect(suggestPrice("7000", markup)).toEqual({ ok: false, code: "INVALID_MARKUP" });
    },
  );

  it.each([null, ""])("returns NO_MARKUP when no markup was loaded (%j)", (markup) => {
    expect(suggestPrice("7000", markup)).toEqual({ ok: false, code: "NO_MARKUP" });
  });

  it.each([null, "abc", "-1", "", "1e3"])(
    "returns INVALID_COST for the cost %j",
    (cost) => {
      expect(suggestPrice(cost, "30")).toEqual({ ok: false, code: "INVALID_COST" });
    },
  );
});
