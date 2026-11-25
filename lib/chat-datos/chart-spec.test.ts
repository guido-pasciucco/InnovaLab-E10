import { describe, expect, it } from "vitest";

import { resolveChart, type ChartSource } from "./chart-spec";

// Numeric columns come back from Postgres as text, like the executor returns them.
const monthly: ChartSource = {
  columns: ["mes", "ventas", "costos", "producto"],
  rows: [
    { mes: "2026-09", ventas: "1200.50", costos: "800", producto: "Alfajor" },
    { mes: "2026-10", ventas: "1500", costos: null, producto: "Alfajor" },
  ],
};

const reasonOf = (input: unknown, source: ChartSource = monthly): string => {
  const result = resolveChart(input, source);
  if (result.ok) throw new Error("expected the chart to be rejected");
  return result.reason;
};

describe("resolveChart: bar, line and histogram", () => {
  it("resolves a bar chart and turns the y values into numbers", () => {
    const result = resolveChart({ type: "bar", title: "Ventas por mes", x: "mes", y: ["ventas"] }, monthly);

    expect(result).toEqual({
      ok: true,
      chart: {
        type: "bar",
        title: "Ventas por mes",
        format: "number",
        x: "mes",
        y: ["ventas"],
        data: [
          { mes: "2026-09", ventas: 1200.5 },
          { mes: "2026-10", ventas: 1500 },
        ],
      },
    });
  });

  it("keeps only the columns the chart uses, and null values as gaps", () => {
    const result = resolveChart(
      { type: "line", title: "Ventas y costos", x: "mes", y: ["ventas", "costos"], format: "currency" },
      monthly,
    );

    expect(result).toMatchObject({
      ok: true,
      chart: {
        type: "line",
        format: "currency",
        data: [
          { mes: "2026-09", ventas: 1200.5, costos: 800 },
          { mes: "2026-10", ventas: 1500, costos: null },
        ],
      },
    });
    if (result.ok) expect(Object.keys(result.chart.data[0])).not.toContain("producto");
  });

  it("writes a missing label as Sin dato", () => {
    const source: ChartSource = { columns: ["rango", "n"], rows: [{ rango: null, n: "3" }] };
    expect(resolveChart({ type: "histogram", title: "Rangos", x: "rango", y: ["n"] }, source)).toMatchObject({
      ok: true,
      chart: { data: [{ rango: "Sin dato", n: 3 }] },
    });
  });

  it("accepts a histogram with one count column and rejects more", () => {
    const source: ChartSource = { columns: ["rango", "n", "m"], rows: [{ rango: "0-10", n: "3", m: "1" }] };
    expect(resolveChart({ type: "histogram", title: "Precios", x: "rango", y: ["n"] }, source).ok).toBe(true);
    expect(reasonOf({ type: "histogram", title: "Precios", x: "rango", y: ["n", "m"] }, source)).toContain("una sola columna");
  });

  it("tells the model which columns exist when one is unknown", () => {
    const reason = reasonOf({ type: "bar", title: "Ventas", x: "month", y: ["ventas"] });
    expect(reason).toContain('"month"');
    expect(reason).toContain("mes, ventas, costos, producto");
  });

  it("rejects an unknown y column", () => {
    expect(reasonOf({ type: "bar", title: "Ventas", x: "mes", y: ["ganancia"] })).toContain('"ganancia"');
  });

  it("rejects a y column that is not a number, naming the value", () => {
    const reason = reasonOf({ type: "bar", title: "Productos", x: "mes", y: ["producto"] });
    expect(reason).toContain('"producto"');
    expect(reason).toContain("Alfajor");
  });

  it("rejects text that only looks empty or numeric-ish", () => {
    const source: ChartSource = { columns: ["a", "b"], rows: [{ a: "x", b: "" }] };
    expect(resolveChart({ type: "bar", title: "T", x: "a", y: ["b"] }, source).ok).toBe(false);
    expect(resolveChart({ type: "bar", title: "T", x: "b", y: ["a"] }, source).ok).toBe(false);
  });

  it("rejects a missing x or y", () => {
    expect(reasonOf({ type: "bar", title: "Ventas", y: ["ventas"] })).toContain("'x'");
    expect(reasonOf({ type: "bar", title: "Ventas", x: "mes" })).toContain("'y'");
  });

  it("rejects the same column in x and y, or repeated in y", () => {
    expect(reasonOf({ type: "bar", title: "Ventas", x: "ventas", y: ["ventas"] })).toContain("a la vez");
    expect(reasonOf({ type: "bar", title: "Ventas", x: "mes", y: ["ventas", "ventas"] })).toContain("repite");
  });

  it("rejects more than three series", () => {
    expect(reasonOf({ type: "line", title: "Todo", x: "mes", y: ["a", "b", "c", "d"] })).toContain("hasta 3");
  });
});

describe("resolveChart: table", () => {
  it("shows every column when none is chosen, keeping values as they are", () => {
    const result = resolveChart({ type: "table", title: "Detalle" }, monthly);
    expect(result).toMatchObject({
      ok: true,
      chart: { type: "table", columns: monthly.columns, data: [{ mes: "2026-09", ventas: "1200.50", costos: "800" }, {}] },
    });
  });

  it("shows only the chosen columns", () => {
    const result = resolveChart({ type: "table", title: "Detalle", columns: ["mes", "ventas"] }, monthly);
    expect(result).toMatchObject({ ok: true, chart: { columns: ["mes", "ventas"] } });
    if (result.ok) expect(result.chart.data[1]).toEqual({ mes: "2026-10", ventas: "1500" });
  });

  it("rejects an unknown column", () => {
    expect(reasonOf({ type: "table", title: "Detalle", columns: ["mes", "margen"] })).toContain('"margen"');
  });
});

describe("resolveChart: the description itself", () => {
  it("rejects an unknown chart type", () => {
    expect(reasonOf({ type: "pie", title: "Torta", x: "mes", y: ["ventas"] })).toContain("bar, line, histogram o table");
  });

  it("rejects a missing or blank title", () => {
    expect(reasonOf({ type: "bar", x: "mes", y: ["ventas"] })).toContain("título");
    expect(reasonOf({ type: "bar", title: "  ", x: "mes", y: ["ventas"] })).toContain("título");
  });

  it("rejects an unknown format", () => {
    expect(reasonOf({ type: "bar", title: "Ventas", x: "mes", y: ["ventas"], format: "euro" })).toContain("formato");
  });

  it("rejects input that is not an object", () => {
    expect(resolveChart(null, monthly).ok).toBe(false);
    expect(resolveChart("un gráfico de barras", monthly).ok).toBe(false);
  });

  it("rejects a chart with no rows to draw", () => {
    const empty: ChartSource = { columns: ["mes", "ventas"], rows: [] };
    expect(reasonOf({ type: "bar", title: "Ventas", x: "mes", y: ["ventas"] }, empty)).toContain("no devolvió filas");
  });
});
