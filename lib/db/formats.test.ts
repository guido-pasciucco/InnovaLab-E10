import { getTableColumns } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { businesses, products } from "./business/table";
import {
  calculations,
  computedResults,
  costingSetup,
  pricingInputs,
  scenarios,
} from "./calculation/table";
import { businessCostLines, calcCostLines } from "./costs/table";
import { profiles } from "./profile/table";
import { moneyString, quantityString } from "./formats";

type NumericColumn = PgColumn & { precision: number; scale: number };

function isNumericColumn(col: PgColumn): col is NumericColumn {
  return (
    typeof (col as Partial<NumericColumn>).precision === "number" &&
    typeof (col as Partial<NumericColumn>).scale === "number"
  );
}

describe("moneyString", () => {
  it.each([
    ["0", true],
    ["9999999999.99", true],
    ["-9999999999.99", true],
    ["1234.5", true],
  ])("accepts %j: %j", (input, expected) => {
    expect(moneyString.safeParse(input).success).toBe(expected);
  });

  // numeric(12,2) holds 10 integer digits; anything longer used to pass Zod
  // and fail in Postgres with a 500 instead of a field error (BUG-004).
  it.each([["99999999999.99"], ["99999999999"], ["-99999999999.99"]])(
    "rejects %j when the integer exceeds 10 digits",
    (input) => {
      expect(moneyString.safeParse(input).success).toBe(false);
    },
  );

  it("keeps rejecting more than 2 decimals", () => {
    expect(moneyString.safeParse("12.345").success).toBe(false);
  });
});

describe("quantityString", () => {
  it.each([
    ["1234.5678", true],
    ["9999999999.9999", true],
    ["-9999999999.9999", true],
  ])("accepts %j: %j", (input, expected) => {
    expect(quantityString.safeParse(input).success).toBe(expected);
  });

  // numeric(14,4) holds 10 integer digits as well (14 - 4).
  it.each([["99999999999.9999"], ["99999999999"]])(
    "rejects %j when the integer exceeds 10 digits",
    (input) => {
      expect(quantityString.safeParse(input).success).toBe(false);
    },
  );

  it("keeps rejecting more than 4 decimals", () => {
    expect(quantityString.safeParse("1.23456").success).toBe(false);
  });
});

describe("column precision", () => {
  // The {1,10} bound above is only honest while every numeric column keeps
  // 10 integer digits. If a migration introduces another precision, this
  // fails and forces the bound to be revisited instead of drifting (BUG-004).
  it("keeps 10 integer digits in every numeric column", () => {
    const tables: PgTable[] = [
      businesses,
      products,
      profiles,
      calculations,
      costingSetup,
      pricingInputs,
      scenarios,
      computedResults,
      businessCostLines,
      calcCostLines,
    ];

    const numeric = tables.flatMap((table) =>
      Object.values(getTableColumns(table)).filter(isNumericColumn),
    );

    expect(numeric.length).toBeGreaterThan(0);
    for (const col of numeric) {
      expect(col.precision - col.scale).toBe(10);
    }
  });
});
