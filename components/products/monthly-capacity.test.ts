import { describe, expect, it } from "vitest";

import {
  formatMonthlyCapacity,
  isMonthlyCapacityMissing,
} from "./monthly-capacity";

describe("isMonthlyCapacityMissing", () => {
  it.each([null, undefined, "", "   ", 0, "0", "00"])(
    "returns true when the capacity is %j",
    (value) => {
      expect(isMonthlyCapacityMissing(value)).toBe(true);
    },
  );

  it.each([120, "120", "2.5", "abc"])(
    "returns false when the capacity is %j",
    (value) => {
      expect(isMonthlyCapacityMissing(value)).toBe(false);
    },
  );
});

describe("formatMonthlyCapacity", () => {
  it.each([null, undefined, 0])(
    "shows Sin cargar when the capacity is %j",
    (value) => {
      expect(formatMonthlyCapacity(value)).toBe("Sin cargar");
    },
  );

  it("shows the saved number when the capacity is positive", () => {
    expect(formatMonthlyCapacity(120)).toBe("120");
  });
});
