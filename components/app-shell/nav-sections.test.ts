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

  it("lists pricing right after the total cost", () => {
    const catalog = NAV_SECTIONS.find((section) => section.id === "catalogo");
    const hrefs = catalog?.items.map((item) => item.href);

    expect(catalog?.items).toContainEqual(expect.objectContaining({ href: "/precios", label: "Precios" }));
    expect(hrefs?.indexOf("/precios")).toBe((hrefs?.indexOf("/total-costs") ?? -2) + 1);
  });

  it("lists the break-even right after pricing", () => {
    const catalog = NAV_SECTIONS.find((section) => section.id === "catalogo");
    const hrefs = catalog?.items.map((item) => item.href);

    expect(catalog?.items).toContainEqual(expect.objectContaining({ href: "/equilibrio", label: "Equilibrio" }));
    expect(hrefs?.indexOf("/equilibrio")).toBe((hrefs?.indexOf("/precios") ?? -2) + 1);
  });
});

describe("sectionFromPathname", () => {
  it.each([
    { path: "/inicio", section: "catalogo" },
    { path: "/supplies", section: "catalogo" },
    { path: "/products", section: "catalogo" },
    { path: "/period-costs", section: "catalogo" },
    { path: "/total-costs", section: "catalogo" },
    { path: "/precios", section: "catalogo" },
    { path: "/equilibrio", section: "catalogo" },
    { path: "/licitaciones", section: "licitaciones" },
    { path: "/proveedores", section: "licitaciones" },
  ])("selects the $section section for $path", ({ path, section }) => {
    expect(sectionFromPathname(path).id).toBe(section);
  });
});
