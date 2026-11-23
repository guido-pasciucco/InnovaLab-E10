import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const DROP_MIGRATION = "drizzle/20261123202736_drop_legacy_calculator_tables.sql";

function sources(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? sources(path)
      : /\.tsx?$/.test(path)
        ? [path]
        : [];
  });
}

describe("legacy calculator removal", () => {
  it("drops exactly the seven legacy tables, never a new-flow table", () => {
    const sql = readFileSync(join(ROOT, DROP_MIGRATION), "utf8");
    const dropped = [...sql.matchAll(/DROP TABLE "([^"]+)"/g)].map((match) => match[1]);

    expect(new Set(dropped)).toEqual(
      new Set([
        "active_calculations",
        "calculations",
        "computed_results",
        "costing_setup",
        "pricing_inputs",
        "scenarios",
        "calc_cost_lines",
      ]),
    );
    for (const kept of ["business_cost_lines", "supplies", "products", "product_ingredients"]) {
      expect(dropped).not.toContain(kept);
    }
  });

  it("keeps the DROP migration in the journal without gaps", () => {
    const journal = JSON.parse(readFileSync(join(ROOT, "drizzle/meta/_journal.json"), "utf8"));
    journal.entries.forEach((entry: { idx: number }, index: number) => {
      expect(entry.idx).toBe(index);
    });
    const dropIndex = journal.entries.findIndex(
      (entry: { tag: string }) => entry.tag === "20261123202736_drop_legacy_calculator_tables",
    );
    expect(dropIndex).toBeGreaterThanOrEqual(0);
    expect(journal.entries[dropIndex]).toMatchObject({ idx: dropIndex });
  });

  it("leaves no /paso- links in app/ or components/", () => {
    const files = [...sources(join(ROOT, "app")), ...sources(join(ROOT, "components"))];
    expect(
      files
        .filter((file) => /\/paso-[1-8]/.test(readFileSync(file, "utf8")))
        .map((file) => relative(ROOT, file)),
    ).toEqual([]);
  });

  it("keeps the modules shared with the new flow", () => {
    for (const file of [
      "lib/services/calculations.ts",
      "lib/schemas/calculator-setup/fields.ts",
      "lib/schemas/costs/fields.ts",
      "lib/db/formats.ts",
      "tests/e2e/pages/paso-2.page.ts",
    ]) {
      expect(() => statSync(join(ROOT, file))).not.toThrow();
    }
  });
});
