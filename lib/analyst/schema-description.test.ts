import { describe, expect, it } from "vitest";

import { formatAnalystSchema, type AnalystColumnInfo } from "./schema-description";

const column = (overrides: Partial<AnalystColumnInfo>): AnalystColumnInfo => ({
  view: "products",
  viewComment: "Productos del emprendedor, uno por fila.",
  column: "id",
  type: "uuid",
  comment: "Identificador del producto.",
  ...overrides,
});

describe("formatAnalystSchema", () => {
  it("lists each view with its comment, and each column with type and comment", () => {
    const text = formatAnalystSchema([
      column({}),
      column({ column: "name", type: "text", comment: "Nombre del producto." }),
    ]);

    expect(text).toBe(
      [
        "Vista products: Productos del emprendedor, uno por fila.",
        "  - id (uuid): Identificador del producto.",
        "  - name (text): Nombre del producto.",
      ].join("\n"),
    );
  });

  it("omits the comment when a column has none", () => {
    expect(formatAnalystSchema([column({ comment: null, viewComment: null })])).toBe(
      "Vista products\n  - id (uuid)",
    );
  });

  it("follows the order of ANALYST_VIEWS and separates views with a blank line", () => {
    const text = formatAnalystSchema([
      column({ view: "supplies", column: "name", type: "text", comment: null, viewComment: null }),
      column({ view: "products", column: "id", comment: null, viewComment: null }),
    ]);

    expect(text.indexOf("Vista products")).toBeLessThan(text.indexOf("Vista supplies"));
    expect(text).toContain("\n\nVista supplies");
  });

  it("leaves out views the validator would reject", () => {
    const text = formatAnalystSchema([column({ view: "current_user_id_helper" }), column({})]);
    expect(text).not.toContain("current_user_id_helper");
    expect(text).toContain("Vista products");
  });
});
