import { describe, expect, it } from "vitest";

import { flowFromPathname } from "@/components/flow-switcher";

import { CHAT_DATOS_SECTION, NAV_SECTIONS, navSections, sectionFromPathname } from "./nav-sections";

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

describe("flowFromPathname", () => {
  it("keeps the chat page inside flow 1", () => {
    expect(flowFromPathname("/chat-datos")).toBe(1);
  });
});
