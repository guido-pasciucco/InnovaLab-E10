import { describe, expect, it } from "vitest";

import { formatChartValue } from "./format";

describe("formatChartValue", () => {
  it("writes pesos the Argentine way", () => {
    expect(formatChartValue(1234.5, "currency")).toBe("$ 1.234,50");
    expect(formatChartValue(0, "currency")).toBe("$ 0,00");
    expect(formatChartValue(-1500, "currency")).toBe("$ -1.500,00");
  });

  it("reads a numeric column that arrived as text", () => {
    expect(formatChartValue("1234.50", "currency")).toBe("$ 1.234,50");
    expect(formatChartValue("12.5", "percent")).toBe("12,5 %");
  });

  it("writes plain numbers with dots for thousands and a comma for decimals", () => {
    expect(formatChartValue(1234567, "number")).toBe("1.234.567");
    expect(formatChartValue(1234.5, "number")).toBe("1.234,5");
    expect(formatChartValue(10, "number")).toBe("10");
    expect(formatChartValue(100, "number")).toBe("100");
    expect(formatChartValue(0.25, "number")).toBe("0,25");
  });

  it("writes percentages", () => {
    expect(formatChartValue(35, "percent")).toBe("35 %");
    expect(formatChartValue(12.345, "percent")).toBe("12,35 %");
  });

  it("reads a tiny negative as zero", () => {
    expect(formatChartValue(-0.001, "number")).toBe("0");
  });

  it("leaves text as it is, even when it looks like a whole number", () => {
    expect(formatChartValue("Torta", "currency")).toBe("Torta");
    expect(formatChartValue("2024", "currency")).toBe("2024");
    expect(formatChartValue("1234.50", "number")).toBe("1234.50");
  });

  it("marks a missing value and writes booleans in Spanish", () => {
    expect(formatChartValue(null, "number")).toBe("—");
    expect(formatChartValue(undefined, "currency")).toBe("—");
    expect(formatChartValue(Number.NaN, "number")).toBe("—");
    expect(formatChartValue(true, "number")).toBe("Sí");
    expect(formatChartValue(false, "number")).toBe("No");
  });
});
