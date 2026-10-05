import { describe, expect, it } from "vitest";
import { parseARS } from "./format";

// The contract table in #94, row by row: 12 accepted shapes and 8 rejected
// ones. The rejects carry as much weight as the accepts — parseARS must not
// guess, so anything ambiguous is null and the schema layer owns the message.

describe("parseARS — accepts", () => {
  it.each([
    ["1500", "1500"],
    ["1.500", "1500"],
    ["1.234.567", "1234567"],
    ["1.234,50", "1234.50"],
    ["1.234.567,89", "1234567.89"],
    ["1234,5", "1234.5"],
    ["1234.50", "1234.50"],
    ["1.5", "1.5"],
    ["0", "0"],
    ["0,50", "0.50"],
    ["$ 1.234,50", "1234.50"],
    ["  1500  ", "1500"],
  ])("normalises %j to %j", (input, expected) => {
    expect(parseARS(input)).toBe(expected);
  });

  it("ignores the non-breaking space that comes with pasted amounts", () => {
    expect(parseARS("$ 1.234,50")).toBe("1234.50");
  });

  it("never pads the fraction, so cents are not invented", () => {
    expect(parseARS("0,5")).toBe("0.5");
  });
});

describe("parseARS — rejects", () => {
  it.each([
    { input: "12,345", why: "more than 2 decimals after a comma" },
    { input: "1.2345", why: "more than 2 decimals after a dot" },
    { input: "-1.500", why: "a negative amount" },
    { input: "", why: "an empty amount" },
    { input: "   ", why: "a whitespace-only amount" },
    { input: "$", why: "no digits at all" },
    { input: "abc", why: "text" },
    { input: "1,234.50", why: "the US format, with comma and dot together" },
    { input: "1.23.4", why: "an incomplete thousands group" },
    { input: "1,2,3", why: "two decimal commas" },
  ])("returns null for $why: $input", ({ input }) => {
    expect(parseARS(input)).toBeNull();
  });

  it("does not treat a comma as a thousands separator", () => {
    expect(parseARS("1,500")).toBeNull();
  });

  it("does not round a third decimal away", () => {
    expect(parseARS("1.234,567")).toBeNull();
  });
});

describe("parseARS — output shape", () => {
  it("stays a decimal string, never a number, to keep cents exact", () => {
    const parsed = parseARS("1.234,50");

    expect(typeof parsed).toBe("string");
    // Matches moneyString in lib/db/formats.ts, which is what the numeric
    // columns are validated against on the way in and out of the database.
    expect(parsed).toMatch(/^\d+(\.\d{1,2})?$/);
  });

  it("never returns a fraction longer than 2 decimals", () => {
    for (const input of ["1.234,56", "0,99", "1234.50", "7"]) {
      const parsed = parseARS(input);

      expect(parsed).not.toBeNull();
      const decimals = parsed!.split(".")[1];
      expect(decimals === undefined || decimals.length <= 2).toBe(true);
    }
  });
});
