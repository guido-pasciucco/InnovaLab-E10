import { describe, expect, it } from "vitest";

import { Fraction } from "./fraction";

describe("Fraction", () => {
  it("parses finite decimal strings exactly and normalizes their ratio", () => {
    expect(Fraction.fromDecimal(" 12.50 ")?.toRatioString()).toBe("25/2");
    expect(Fraction.fromDecimal("-0.005")?.toRatioString()).toBe("-1/200");
    expect(Fraction.fromDecimal("1e-3")).toBeUndefined();
  });

  it("preserves recurring divisions through exact addition", () => {
    const one = Fraction.fromDecimal("1")!;
    const total = one.divide(Fraction.fromDecimal("300")!)
      .add(one.divide(Fraction.fromDecimal("1200")!))
      .add(one.divide(Fraction.fromDecimal("1200")!));

    expect(total.toRatioString()).toBe("1/200");
    expect(total.toFixed(2)).toBe("0.01");
  });

  it("rounds positive and negative half cents with ROUND_HALF_UP", () => {
    expect(Fraction.fromDecimal("0.005")!.toFixed(2)).toBe("0.01");
    expect(Fraction.fromDecimal("-0.005")!.toFixed(2)).toBe("-0.01");
  });

  it("rejects invalid and deliberately oversized decimal inputs", () => {
    expect(Fraction.fromDecimal("Infinity")).toBeUndefined();
    expect(Fraction.fromDecimal("1.".padEnd(102, "1"))).toBeUndefined();
  });
});
