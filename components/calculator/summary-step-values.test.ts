import { describe, expect, it } from "vitest";

import type { CalculatorSummary } from "@/lib/types/calculator";

import { buildSummaryText, summaryAssumptions, toSummaryRows } from "./summary-step-values";

// Mockup example: fixed 320.000, variable 2.500 per unit and 200 units give a
// unit cost of 4.100; the 30 % margin prices it at 5.857,14, with a profit of
// 351.428,57 and a break-even of 96 units (558.298,08 of sales).
const ready: CalculatorSummary = {
  calculationId: "calc-1",
  status: "ready",
  productName: "Pan de avena",
  period: "Mensual",
  volume: 200,
  unitCost: "4100.00",
  suggestedPrice: "5857.14",
  realMarginPct: "30.00",
  estimatedProfit: "351428.57",
  breakEvenUnits: "96",
  breakEvenSales: "558298.08",
  currency: "ARS",
};

const missingMargin: CalculatorSummary = {
  ...ready,
  status: "missing-margin",
  suggestedPrice: null,
  realMarginPct: null,
  estimatedProfit: null,
  breakEvenUnits: null,
  breakEvenSales: null,
};

describe("toSummaryRows", () => {
  it("formats every figure the way the wizard shows amounts", () => {
    expect(toSummaryRows(ready)).toEqual([
      { label: "Producto", value: "Pan de avena" },
      { label: "Costo unitario", value: "$4.100" },
      { label: "Precio sugerido", value: "$5.857,14" },
      { label: "Margen real", value: "30 %" },
      { label: "Ganancia estimada", value: "$351.428,57" },
      { label: "Equilibrio", value: "96 u. · $558.298,08" },
    ]);
  });

  it("shows a dash for the figures that are not computed yet", () => {
    expect(toSummaryRows(missingMargin)).toEqual([
      { label: "Producto", value: "Pan de avena" },
      { label: "Costo unitario", value: "$4.100" },
      { label: "Precio sugerido", value: "—" },
      { label: "Margen real", value: "—" },
      { label: "Ganancia estimada", value: "—" },
      { label: "Equilibrio", value: "—" },
    ]);
  });

  it("keeps the sign of a loss", () => {
    const rows = toSummaryRows({ ...ready, estimatedProfit: "-1500.50", realMarginPct: "-4.50" });

    expect(rows).toContainEqual({ label: "Ganancia estimada", value: "$-1.500,50" });
    expect(rows).toContainEqual({ label: "Margen real", value: "-4,5 %" });
  });
});

describe("summaryAssumptions", () => {
  it("names the period and the volume, and that selling costs are left out", () => {
    expect(summaryAssumptions(ready)).toBe(
      "Supuestos: período mensual, 200 unidades, sin costos de venta.",
    );
  });

  it("uses the singular for a single unit", () => {
    expect(summaryAssumptions({ ...ready, volume: 1 })).toBe(
      "Supuestos: período mensual, 1 unidad, sin costos de venta.",
    );
  });

  it("leaves out what step 1 has not saved yet", () => {
    expect(summaryAssumptions({ ...ready, period: null, volume: null })).toBe(
      "Supuestos: sin costos de venta.",
    );
  });
});

describe("buildSummaryText", () => {
  it("lists the rows, the assumptions and the disclaimer as plain text", () => {
    expect(buildSummaryText(ready)).toBe(
      [
        "Resumen de costos",
        "Producto: Pan de avena",
        "Costo unitario: $4.100",
        "Precio sugerido: $5.857,14",
        "Margen real: 30 %",
        "Ganancia estimada: $351.428,57",
        "Equilibrio: 96 u. · $558.298,08",
        "",
        "Supuestos: período mensual, 200 unidades, sin costos de venta.",
        "Herramienta de apoyo: no reemplaza el asesoramiento contable o impositivo.",
      ].join("\n"),
    );
  });
});
