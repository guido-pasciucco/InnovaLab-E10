import { describe, expect, it } from "vitest";

import { calculateFixedSubtotal } from "./fixed-subtotal";

describe("calculateFixedSubtotal", () => {
  it("adds the amounts of every row", () => {
    const rows = [
      { id: "a", amount: "60000" },
      { id: "b", amount: "20000.50" },
      { id: "c", amount: "10000" },
    ];

    const result = calculateFixedSubtotal(rows);

    expect(result).toEqual({ ok: true, subtotal: "90000.50" });
  });

  it("skips rows without an amount", () => {
    const rows = [
      { id: "a", amount: "100" },
      { id: "b", amount: "" },
    ];

    const result = calculateFixedSubtotal(rows);

    expect(result).toEqual({ ok: true, subtotal: "100.00" });
  });

  it("returns a null subtotal when no row has an amount", () => {
    const rows = [
      { id: "a", amount: "" },
      { id: "b", amount: "" },
    ];

    const result = calculateFixedSubtotal(rows);

    expect(result).toEqual({ ok: true, subtotal: null });
  });

  it("returns a null subtotal when there are no rows", () => {
    expect(calculateFixedSubtotal([])).toEqual({ ok: true, subtotal: null });
  });

  it("counts a zero amount as a real total", () => {
    const result = calculateFixedSubtotal([{ id: "a", amount: "0" }]);

    expect(result).toEqual({ ok: true, subtotal: "0.00" });
  });

  it("surfaces the engine code when a row id is duplicated", () => {
    const rows = [
      { id: "a", amount: "1" },
      { id: "a", amount: "2" },
    ];

    const result = calculateFixedSubtotal(rows);

    expect(result).toEqual({ ok: false, code: "DUPLICATE_LINE_ID" });
  });

  it("surfaces the engine code when an amount is not a decimal", () => {
    const result = calculateFixedSubtotal([{ id: "a", amount: "abc" }]);

    expect(result).toEqual({ ok: false, code: "INVALID_AMOUNT" });
  });
});
