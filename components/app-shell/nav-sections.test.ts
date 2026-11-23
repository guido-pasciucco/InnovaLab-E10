import { describe, expect, it } from "vitest";

import { NAV_SECTIONS, sectionFromPathname } from "./nav-sections";

describe("NAV_SECTIONS", () => {
  it("lists period costs in the catalog sidebar items", () => {
    const catalog = NAV_SECTIONS.find((section) => section.id === "catalogo");

    expect(catalog?.items).toContainEqual(
      expect.objectContaining({ href: "/period-costs", label: "Gastos del período" }),
    );
  });
});

describe("sectionFromPathname", () => {
  it.each([
    { path: "/insumos", section: "catalogo" },
    { path: "/products", section: "catalogo" },
    { path: "/period-costs", section: "catalogo" },
    { path: "/licitaciones", section: "licitaciones" },
    { path: "/proveedores", section: "licitaciones" },
  ])("selects the $section section for $path", ({ path, section }) => {
    expect(sectionFromPathname(path).id).toBe(section);
  });
});
