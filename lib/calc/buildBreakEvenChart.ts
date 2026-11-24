import Decimal from "decimal.js";

import type { BreakEven } from "@/lib/types/break-even";

// Pure chart data for the break-even view (#247). The dashboard (#246) owns the
// numbers; this function only turns an already computed BreakEven into the
// points a line chart needs. Nothing is recalculated except the straight lines
// themselves.
//
// Axis X (P-10): sales in pesos of the mix. Units of different products cannot
// be added (2 cakes and 10 alfajores are not 12 of anything), pesos can. The
// range goes from 0 to the larger of the full-capacity sales (Σ capacity ×
// price) and 1.5 × break-even sales, so the crossing always falls inside the
// chart.
//
// Lines (P-11):
//   ingresos      y = x
//   costos totales y = gastos del mes + x × (1 − ratio de contribución exacto)
//   gastos fijos   y = gastos del mes
//
// The exact ratio is derived from totals.breakEvenSales and
// totals.periodFixedCosts instead of using totals.contributionRatio directly:
// the engine returns that ratio rounded to 6 decimals, and using it would move
// the crossing a few cents away from the break-even sales the dashboard shows.
// With breakEvenSales = fixed / exact ratio, the line passes exactly through
// (breakEvenSales, breakEvenSales): the same line, without the rounding drift.
//
// Money leaves as decimal strings with 2 decimals, rounded once at the end with
// ROUND_HALF_UP. The component converts them to numbers only to draw.

const MONEY_DECIMALS = 2;
const MONEY_ROUNDING = Decimal.ROUND_HALF_UP;
const ONE_AND_A_HALF = new Decimal("1.5");

export type BreakEvenChartPoint = {
  // Position on the X axis: sales in pesos.
  sales: string;
  revenue: string;
  totalCosts: string;
  fixedCosts: string;
};

export type BreakEvenChartData = {
  range: { min: string; max: string };
  // Three points: 0, the break-even and the end of the axis.
  points: readonly BreakEvenChartPoint[];
  breakEven: { sales: string; revenue: string; totalCosts: string };
};

function asMoney(value: Decimal): string {
  return value.toFixed(MONEY_DECIMALS, MONEY_ROUNDING);
}

function parseAmount(raw: string): Decimal | null {
  try {
    const value = new Decimal(raw.trim());
    return value.isFinite() ? value : null;
  } catch {
    return null;
  }
}

function toPoint(
  sales: Decimal,
  fixedCosts: Decimal,
  variableRatio: Decimal,
): BreakEvenChartPoint {
  return {
    sales: asMoney(sales),
    revenue: asMoney(sales),
    totalCosts: asMoney(fixedCosts.plus(sales.times(variableRatio))),
    fixedCosts: asMoney(fixedCosts),
  };
}

export function buildBreakEvenChart(breakEven: BreakEven): BreakEvenChartData | null {
  // P-12: only a ready dashboard has a chart; every other state keeps the
  // message of the view (#246).
  if (breakEven.status !== "ready" || breakEven.totals === null) {
    return null;
  }

  const fixedCosts = parseAmount(breakEven.totals.periodFixedCosts);
  const breakEvenSales = parseAmount(breakEven.totals.breakEvenSales);
  if (fixedCosts === null || breakEvenSales === null) {
    return null;
  }

  // A ready state always has expenses, so the break-even sales are > 0. The
  // guard keeps an undefined slope from ever reaching the chart.
  if (fixedCosts.lt(0) || breakEvenSales.lte(0)) {
    return null;
  }

  const fullCapacitySales = breakEven.rows.reduce((sum, row) => {
    const price = parseAmount(row.price);
    if (price === null) {
      return sum;
    }

    return sum.plus(new Decimal(row.capacity).times(price));
  }, new Decimal(0));

  const maxSales = Decimal.max(fullCapacitySales, breakEvenSales.times(ONE_AND_A_HALF));

  // (breakEvenSales − fixedCosts) / breakEvenSales = 1 − exact ratio.
  const variableRatio = breakEvenSales.minus(fixedCosts).div(breakEvenSales);

  return {
    range: { min: asMoney(new Decimal(0)), max: asMoney(maxSales) },
    points: [
      toPoint(new Decimal(0), fixedCosts, variableRatio),
      toPoint(breakEvenSales, fixedCosts, variableRatio),
      toPoint(maxSales, fixedCosts, variableRatio),
    ],
    // The crossing is the engine's break-even, not a line intersection: it is
    // the number the dashboard already shows.
    breakEven: {
      sales: asMoney(breakEvenSales),
      revenue: asMoney(breakEvenSales),
      totalCosts: asMoney(breakEvenSales),
    },
  };
}
