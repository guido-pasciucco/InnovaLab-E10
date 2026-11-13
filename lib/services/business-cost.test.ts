import { describe, expect, it } from "vitest";

import { currentPeriodKey } from "./business-cost";

describe("currentPeriodKey", () => {
  it("uses the Argentina month when UTC is already the next month", () => {
    expect(currentPeriodKey(new Date("2026-12-01T02:00:00.000Z"))).toBe("2026-11");
  });

  it("formats the month with two digits", () => {
    expect(currentPeriodKey(new Date("2026-01-15T12:00:00.000Z"))).toBe("2026-01");
  });
});
