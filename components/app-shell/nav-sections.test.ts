import { describe, expect, it } from "vitest";

import { CHAT_DATOS_SECTION, NAV_SECTIONS, navSections, sectionFromPathname } from "./nav-sections";

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

    expect(catalog?.items).toContainEqual(
      expect.objectContaining({ href: "/equilibrio", label: "Punto de Equilibrio" }),
    );
    expect(hrefs?.indexOf("/equilibrio")).toBe((hrefs?.indexOf("/precios") ?? -2) + 1);
  });

  it("lists historical data right after the break-even", () => {
    const catalog = NAV_SECTIONS.find((section) => section.id === "catalogo");
    const hrefs = catalog?.items.map((item) => item.href) ?? [];

    expect(catalog?.items).toContainEqual(
      expect.objectContaining({ href: "/historico", label: "Datos históricos" }),
    );
    expect(hrefs.indexOf("/historico")).toBe(hrefs.indexOf("/equilibrio") + 1);
  });
});

describe("navSections", () => {
  it("has no chat tab while the feature is off", () => {
    const sections = navSections({ chatDatosEnabled: false });

    expect(sections.map((section) => section.id)).toEqual(["catalogo", "licitaciones"]);
    expect(sections.some((section) => section.href === "/chat-datos")).toBe(false);
  });

  it("adds the chat tab last when the feature is on", () => {
    const sections = navSections({ chatDatosEnabled: true });

    expect(sections.map((section) => section.id)).toEqual(["catalogo", "licitaciones", "chat-datos"]);
    expect(sections[2]).toBe(CHAT_DATOS_SECTION);
    expect(CHAT_DATOS_SECTION.label).toBe("Chateá con tus datos");
  });

  it("does not change the base sections", () => {
    navSections({ chatDatosEnabled: true });

    expect(NAV_SECTIONS).toHaveLength(2);
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
    { path: "/historico", section: "catalogo" },
    { path: "/historico/2026-11", section: "catalogo" },
    { path: "/licitaciones", section: "licitaciones" },
    { path: "/proveedores", section: "licitaciones" },
  ])("selects the $section section for $path", ({ path, section }) => {
    expect(sectionFromPathname(path).id).toBe(section);
  });

  it("finds the chat section under its path", () => {
    const sections = navSections({ chatDatosEnabled: true });

    expect(sectionFromPathname("/chat-datos", sections).id).toBe("chat-datos");
    expect(sectionFromPathname("/products", sections).id).toBe("catalogo");
  });

  it("falls back to the first section when the chat is off", () => {
    const sections = navSections({ chatDatosEnabled: false });

    expect(sectionFromPathname("/chat-datos", sections).id).toBe("catalogo");
  });

  it("keeps working without the sections argument", () => {
    expect(sectionFromPathname("/licitaciones").id).toBe("licitaciones");
  });
});
