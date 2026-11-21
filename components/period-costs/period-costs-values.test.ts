import { describe, expect, it } from "vitest";

import { formatPeriodLabel, toCostLine } from "./period-costs-values";

describe("formatPeriodLabel", () => {
  it.each([
    { period: "2026-01", expected: "enero de 2026" },
    { period: "2026-02", expected: "febrero de 2026" },
    { period: "2026-03", expected: "marzo de 2026" },
    { period: "2026-04", expected: "abril de 2026" },
    { period: "2026-05", expected: "mayo de 2026" },
    { period: "2026-06", expected: "junio de 2026" },
    { period: "2026-07", expected: "julio de 2026" },
    { period: "2026-08", expected: "agosto de 2026" },
    { period: "2026-09", expected: "septiembre de 2026" },
    { period: "2026-10", expected: "octubre de 2026" },
    { period: "2026-11", expected: "noviembre de 2026" },
    { period: "2026-12", expected: "diciembre de 2026" },
  ])("renders $period as $expected", ({ period, expected }) => {
    expect(formatPeriodLabel(period)).toBe(expected);
  });

  it.each(["", "2026-13", "2026-1", "2026/11", "noviembre"])(
    "returns an unexpected key %j unchanged",
    (period) => {
      expect(formatPeriodLabel(period)).toBe(period);
    },
  );
});

describe("toCostLine", () => {
  it("shows the period amount as the table's amount", () => {
    expect(
      toCostLine({ id: "line-1", concept: "Alquiler", amountPeriod: "150000.00" }),
    ).toEqual({ id: "line-1", concept: "Alquiler", amount: "150000.00" });
  });
});
