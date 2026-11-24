import { describe, expect, it } from "vitest";

import { NAV_SECTIONS, sectionFromPathname } from "./nav-sections";

describe("NAV_SECTIONS", () => {
  it("opens the catalog sidebar with the home page", () => {
    const catalog = NAV_SECTIONS.find((section) => section.id === "catalogo");

    expect(catalog?.items[0]).toEqual(expect.objectContaining({ href: "/inicio", label: "Inicio" }));
  });

  it("lists period costs in the catalog sidebar items", () => {
    const catalog = NAV_SECTIONS.find((section) => section.id === "catalogo");

    expect(catalog?.items).toContainEqual(
      expect.objectContaining({ href: "/period-costs", label: "Gastos del período" }),
    );
  });

  it("lists the total cost per product after the period costs", () => {
    const catalog = NAV_SECTIONS.find((section) => section.id === "catalogo");
    const hrefs = catalog?.items.map((item) => item.href);

    expect(catalog?.items).toContainEqual(
      expect.objectContaining({ href: "/total-costs", label: "Costo total" }),
    );
    expect(hrefs?.indexOf("/total-costs")).toBeGreaterThan(hrefs?.indexOf("/period-costs") ?? Infinity);
  });
});

describe("sectionFromPathname", () => {
  it.each([
    { path: "/inicio", section: "catalogo" },
    { path: "/supplies", section: "catalogo" },
    { path: "/products", section: "catalogo" },
    { path: "/period-costs", section: "catalogo" },
    { path: "/total-costs", section: "catalogo" },
    { path: "/licitaciones", section: "licitaciones" },
    { path: "/proveedores", section: "licitaciones" },
  ])("selects the $section section for $path", ({ path, section }) => {
    expect(sectionFromPathname(path).id).toBe(section);
  });
});
