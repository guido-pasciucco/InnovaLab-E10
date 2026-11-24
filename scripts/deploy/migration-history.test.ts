import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "drizzle");
const journal = JSON.parse(readFileSync(join(root, "meta/_journal.json"), "utf8")) as {
  entries: { idx: number; tag: string; when: number }[];
};

describe("combined migration history", () => {
  it("has contiguous indices, strictly increasing timestamps and a SQL file for every entry", () => {
    expect(new Set(journal.entries.map((e) => e.tag)).size).toBe(journal.entries.length);
    journal.entries.forEach((e, idx) => {
      expect(e.idx).toBe(idx);
      if (idx) expect(e.when).toBeGreaterThan(journal.entries[idx - 1].when);
      expect(readFileSync(join(root, `${e.tag}.sql`), "utf8").trim()).not.toBe("");
    });
  });

  it("preserves historical SQL and verifies both recorded checkout hashes", () => {
    const repair = readFileSync(join(root, `${journal.entries.at(-1)!.tag}.sql`), "utf8");
    for (const [tag, expected] of [
      ["20261121185825_confused_hellion", "5e8358a68d1a21b746d766e07fd64a6357d146e4b4c0a19237876899bc68bf0c"],
      ["20261121185953_help_usage_security", "95678fdd46c5939e950775c6bd566d0f5ddca2cdc6fb3bf9e448c275c31f531f"],
    ]) {
      const sql = readFileSync(join(root, `${tag}.sql`), "utf8").replaceAll("\r\n", "\n");
      expect(createHash("sha256").update(sql).digest("hex")).toBe(expected);
      for (const variant of [sql, sql.replaceAll("\n", "\r\n")]) {
        expect(repair).toContain(createHash("sha256").update(variant).digest("hex"));
      }
    }
  });

  it("has one active snapshot chain ending in main plus help, without legacy tables", () => {
    const files = readdirSync(join(root, "meta")).filter((f) => f.endsWith("_snapshot.json")).sort();
    const snapshots = files.map((f) => JSON.parse(readFileSync(join(root, "meta", f), "utf8")));
    expect(new Set(snapshots.map((s) => s.id)).size).toBe(snapshots.length);
    snapshots.slice(1).forEach((s, i) => expect(s.prevId).toBe(snapshots[i].id));
    const final = snapshots.at(-1);
    expect(final.tables).toHaveProperty("public.help_usage");
    expect(final.tables).toHaveProperty("public.knowledge_chunks");
    for (const table of ["calculations", "active_calculations", "calc_cost_lines", "computed_results", "costing_setup", "pricing_inputs", "scenarios"]) {
      expect(Object.keys(final.tables)).not.toContain(`public.${table}`);
    }
  });
});
