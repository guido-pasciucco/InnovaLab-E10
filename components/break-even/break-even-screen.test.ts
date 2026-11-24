import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { BreakEvenView } from "./break-even-values";
import { BreakEvenScreen } from "./break-even-screen";

const readyView: BreakEvenView = {
  period: "2026-11",
  status: "ready",
  banner: null,
  summary: {
    expenses: "$ 150.000,00",
    units: "225 unidades",
    sales: "$ 363.750,00",
  },
  rows: [
    {
      id: "a",
      name: "Producto A",
      price: "$ 1.800,00",
      variableUnit: "$ 1.000,00",
      contributionUnit: "$ 800,00",
      marginPct: "16,6667 %",
      mixPct: "33,3333 %",
      quotaWhole: "63 u.",
      quotaExact: "62,5 u. exactas",
      hasNegativeContribution: false,
    },
  ],
  closingContribution: "$ 150.000,00",
  exclusions: [],
  hasNegativeContribution: false,
};

function render(view: BreakEvenView = readyView, chart?: ReactNode): string {
  return renderToStaticMarkup(createElement(BreakEvenScreen, { view, chart }));
}

describe("BreakEvenScreen", () => {
  it("renders the summary, semantic table, exact quota and closing check", () => {
    const html = render();

    expect(html).toContain("Resumen del mes");
    expect(html).toContain("<table");
    expect(html).toContain("<caption");
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("62,5 u. exactas");
    expect(html).toContain("Prueba de cierre");
  });

  it("renders an actionable non-ready state without result sections", () => {
    const html = render({
      ...readyView,
      status: "no_prices",
      banner: {
        title: "Faltan los precios",
        text: "Definí los precios.",
        href: "/pricing",
        action: "Ir a precios",
      },
      summary: null,
      rows: [],
      closingContribution: null,
    });

    expect(html).toContain("Faltan los precios");
    expect(html).toContain('href="/pricing"');
    expect(html).not.toContain("Resumen del mes");
    expect(html).not.toContain("<table");
  });

  it("renders the optional chart integration point only when supplied", () => {
    const withoutChart = render();
    const withChart = render(readyView, createElement("div", { "data-testid": "chart-slot" }));

    expect(withoutChart).not.toContain("chart-slot");
    expect(withChart).toContain("chart-slot");
  });
});
