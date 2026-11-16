import { describe, expect, it } from "vitest";

import {
  capitalizeFirstWord,
  formatMoneyInput,
  formatMoneyTyping,
  parseMoneyInput,
} from "./input-format";

describe("capitalizeFirstWord", () => {
  it("capitalizes only the first letter", () => {
    expect(capitalizeFirstWord("harina 000")).toBe("Harina 000");
    expect(capitalizeFirstWord("bolsa kraft")).toBe("Bolsa kraft");
  });

  it("trims the value and keeps empty strings empty", () => {
    expect(capitalizeFirstWord("  harina  ")).toBe("Harina");
    expect(capitalizeFirstWord("   ")).toBe("");
  });
});

describe("formatMoneyTyping", () => {
  it("groups the integer part with dots", () => {
    expect(formatMoneyTyping("20000")).toBe("20.000");
    expect(formatMoneyTyping("1234567")).toBe("1.234.567");
  });

  it("keeps up to two decimals after a comma", () => {
    expect(formatMoneyTyping("20000,5")).toBe("20.000,5");
    expect(formatMoneyTyping("20000,50")).toBe("20.000,50");
    expect(formatMoneyTyping("20000,505")).toBe("20.000,50");
  });

  it("accepts an already formatted value", () => {
    expect(formatMoneyTyping("20.000,50")).toBe("20.000,50");
  });
});

describe("parseMoneyInput", () => {
  it("returns the canonical decimal string", () => {
    expect(parseMoneyInput("20.000,50")).toBe("20000.50");
    expect(parseMoneyInput("20.000")).toBe("20000");
    expect(parseMoneyInput("20,5")).toBe("20.5");
    expect(parseMoneyInput("")).toBe("");
  });

  it("ignores extra separators and limits cents", () => {
    expect(parseMoneyInput("20.000,505")).toBe("20000.50");
    expect(parseMoneyInput("1.234.567")).toBe("1234567");
  });
});

describe("formatMoneyInput", () => {
  it("formats a canonical value for display", () => {
    expect(formatMoneyInput("20000.50")).toBe("20.000,50");
    expect(formatMoneyInput("20000.5")).toBe("20.000,5");
    expect(formatMoneyInput("20000")).toBe("20.000");
    expect(formatMoneyInput("")).toBe("");
  });
});
