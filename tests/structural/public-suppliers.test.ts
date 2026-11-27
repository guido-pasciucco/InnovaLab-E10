import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

// Issue #309: the invitation model must not come back. These guards cover the
// schema, the production code and the migration journal.

const ROOT = process.cwd();
const MIGRATIONS = [
  "20261126200249_living_otto_octavius",
  "20261126200305_public-suppliers-backfill",
  "20261126200405_known_vengeance",
];

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

const schema = ["lib/db/suppliers/table.ts", "lib/db/tenders/table.ts"]
  .map((file) => readFileSync(join(ROOT, file), "utf8"))
  .join("\n");

describe("public supplier registry (#309)", () => {
  it("declares supplier-keyed tables and drops the invitation tables", () => {
    for (const table of ["suppliers", "tender_negotiations", "tender_offers", "tender_awards", "purchase_orders"]) {
      expect(schema).toMatch(new RegExp(`pgTable\\(\\s*["']${table}["']`));
    }
    for (const table of ["supplier_invites", "supplier_links", "tender_invitations"]) {
      expect(schema).not.toMatch(new RegExp(`pgTable\\(\\s*["']${table}["']`));
    }
  });

  it("keys offers, awards and orders by supplier, not by invitation", () => {
    expect(schema).not.toMatch(/invitation_id/);
    expect(schema.match(/supplier_user_id/g)).toHaveLength(4);
  });

  it("leaves no invitation route or reference in app/ and components/", () => {
    const files = [...sources(join(ROOT, "app")), ...sources(join(ROOT, "components"))];
    const offenders = files
      .filter((file) => /invitacion|invitationId|tenderInvitations|supplierInvites|supplierLinks/.test(readFileSync(file, "utf8")))
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  });

  it("keeps the public registration page and the old invite page gone", () => {
    expect(existsSync(join(ROOT, "app/proveedores/registro/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/proveedores/registro/completar/route.ts"))).toBe(true);
    expect(existsSync(join(ROOT, "app/proveedores/invitacion"))).toBe(false);
  });

  it("registers the three migrations in order, with the backfill before the drop", () => {
    const journal = JSON.parse(readFileSync(join(ROOT, "drizzle/meta/_journal.json"), "utf8"));
    const indexes = MIGRATIONS.map(
      (tag) => journal.entries.findIndex((entry: { tag: string }) => entry.tag === tag),
    );
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(indexes.every((index: number) => index >= 0)).toBe(true);
    journal.entries.forEach((entry: { idx: number }, index: number) => {
      expect(entry.idx).toBe(index);
    });
  });
});
