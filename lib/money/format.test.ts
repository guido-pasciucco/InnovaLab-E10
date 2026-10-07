import { describe, expect, it } from "vitest";
import { formatARS, parseARS } from "./format";

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
    expect(parseARS("$ 1.234,50")).toBe("1234.50");
  });

  // Grouping spaces carry no meaning between digits, wherever they appear, so
  // `1 23` is read exactly like `1 000 000`: the user reviews what landed in the
  // field before saving. Rejecting the one and accepting the other would be
  // arbitrary.
  it.each([
    ["1 23", "123"],
    ["1 000 000", "1000000"],
    ["1 234,50", "1234.50"],
  ])("treats internal spaces as noise: %j becomes %j", (input, expected) => {
    expect(parseARS(input)).toBe(expected);
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

  // A `$` is only currency notation at the very start. Anywhere else it is a
  // mistake, so it survives the cleanup and the patterns reject the input
  // instead of quietly returning a valid amount for a malformed string.
  it.each([
    { input: "1$.234", why: "a dollar sign inside the digits" },
    { input: "$1.500$", why: "a second dollar sign at the end" },
  ])("returns null for $why: $input", ({ input }) => {
    expect(parseARS(input)).toBeNull();
  });

  // Comma and dot together mean the US format, and the order they appear in
  // decides nothing: `1.234,50` is Argentine, `1,234.50` is not. Neither is
  // guessed.
  it("rejects the US format while accepting the Argentine one", () => {
    expect(parseARS("1,234.50")).toBeNull();
    expect(parseARS("1.234,50")).toBe("1234.50");
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

// The display table from #95. These cases are the authority on the format:
// #27 has the last word on the visible format, and until then any change to the
// expectations below is a deliberate decision rather than a side effect.
describe("formatARS — accepts", () => {
  it.each([
    ["1500", "$ 1.500,00"],
    ["1234.5", "$ 1.234,50"],
    ["0", "$ 0,00"],
    ["1234567.89", "$ 1.234.567,89"],
  ])("renders %j as %j", (amount, expected) => {
    expect(formatARS(amount)).toBe(expected);
  });

  it.each([
    { amount: "1", why: "a single digit needs no group" },
    { amount: "12", why: "two digits fit in one group" },
    { amount: "999", why: "three digits fill the first group exactly" },
    { amount: "1000", why: "a dot starts at the fourth digit" },
    { amount: "123456789", why: "grouping repeats over millions" },
    { amount: "999999999999", why: "numeric(12,2) fits twelve digits" },
  ])("groups $why: $amount", ({ amount }) => {
    expect(formatARS(amount)).toMatch(/^\$ \d{1,3}(\.\d{3})*,00$/);
  });

  // Two decimals always, so the cents column lines up down a table.
  it.each([
    { amount: "0", why: "no decimals at all" },
    { amount: "7.5", why: "one decimal" },
    { amount: "1234.50", why: "already two" },
  ])("pads to two decimals for $why: $amount", ({ amount }) => {
    expect(formatARS(amount)).toMatch(/,00$|,50$/);
  });
});

describe("formatARS — negatives", () => {
  // The form rejects a negative amount, but a numeric column allows one and a
  // contribution margin below zero is a real result, so the sign has to render.
  // It goes after the `$`: a leading dash reads as a dash, not as a minus.
  it.each([
    ["-1234.50", "$ -1.234,50"],
    ["-0.5", "$ -0,50"],
    ["-1234567.89", "$ -1.234.567,89"],
  ])("keeps the sign after the currency symbol: %j becomes %j", (amount, expected) => {
    expect(formatARS(amount)).toBe(expected);
  });

  it("never turns a negative into a positive by dropping the sign", () => {
    expect(formatARS("-1234.50")).not.toBe(formatARS("1234.50"));
  });
});

describe("formatARS — unrenderable input", () => {
  // The precondition says a decimal, so this should not happen: the input comes
  // from a numeric column or from parseARS. Defined as an empty string rather
  // than a throw, so a bad value cannot take down a results screen, and never as
  // null, which would force every caller to handle a case that cannot occur.
  it.each([
    { amount: "", why: "an empty amount" },
    { amount: "abc", why: "text" },
    { amount: "1.234", why: "three decimals" },
    { amount: "1,234.50", why: "the US format" },
    { amount: "$1234.50", why: "an unparsed currency symbol" },
    { amount: " 1500", why: "untrimmed whitespace" },
  ])("returns an empty string for $why: $amount", ({ amount }) => {
    expect(formatARS(amount)).toBe("");
  });
});

describe("formatARS — round trip", () => {
  // The two functions never call each other — a calculation sits between them —
  // so a value that survives parseARS has to survive formatARS too.
  it.each([
    ["1500", "$ 1.500,00"],
    ["1.234,50", "$ 1.234,50"],
    ["0", "$ 0,00"],
    ["1.234.567,89", "$ 1.234.567,89"],
    ["0,50", "$ 0,50"],
    ["99,99", "$ 99,99"],
  ])("renders what parseARS read from %j: %j", (argentine, expected) => {
    const parsed = parseARS(argentine);

    expect(parsed).not.toBeNull();
    expect(formatARS(parsed!)).toBe(expected);
  });
});
