import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const src = [
  "lib/db/business/table.ts",
  "lib/db/costs/table.ts",
  "lib/db/supplies/table.ts",
]
  .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
  .join("\n");

describe("db schema after legacy removal", () => {
  it("keeps the new-flow tables declared", () => {
    for (const table of ["business_cost_lines", "supplies", "products", "product_ingredients"]) {
      expect(src).toMatch(new RegExp(`pgTable\\(\\s*["']${table}["']`));
    }
  });

  it("removes every legacy table declaration", () => {
    for (const table of [
      "active_calculations",
      "costing_setup",
      "pricing_inputs",
      "scenarios",
      "computed_results",
      "calc_cost_lines",
    ]) {
      expect(src).not.toMatch(new RegExp(`pgTable\\(\\s*["']${table}["']`));
    }
  });
});
