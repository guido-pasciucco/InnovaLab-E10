import type { BreakEvenPoint } from "@/components/charts/break-even-chart";
import { calculateBreakEven } from "@/lib/calc/calculateBreakEven";
import { calculatePricing } from "@/lib/calc/calculatePricing";
import { formatARS } from "@/lib/money/format";

import type { PricingCosts } from "./pricing-step-values";

export type BreakEvenChartValues = {
  points: BreakEvenPoint[];
  // X-axis end: the estimated volume, or the break-even when it is further.
  volume: number;
  breakEvenUnits: number;
  breakEvenSales: number;
  description: string;
};

export type BreakEvenStepProps =
  | {
      status: "ready";
      volume: number;
      // Whole units to sell, rounded up.
      breakEvenUnits: number;
      // The break-even needs more units than the user estimates selling.
      exceedsVolume: boolean;
      // Money string for formatARS ("558298.08").
      breakEvenSales: string;
      chart: BreakEvenChartValues;
    }
  | { status: "missing-costs" }
  | { status: "missing-margin" }
  | { status: "no-contribution" };

// Maps the persisted costs and the step 5 margin to what step 6 shows. The
// price comes from calculatePricing, as on step 5, so both steps agree on it;
// the break-even comes from the pure engine. Number() is used only for the
// chart, whose values are SVG coordinates, never amounts the UI adds up.
export function toBreakEvenStepProps(
  costs: PricingCosts | null,
  marginPct: string | null,
): BreakEvenStepProps {
  if (
    costs === null ||
    costs.unitCost === null ||
    costs.variableUnit === null ||
    costs.totalFixed === null ||
    costs.volume === null
  ) {
    return { status: "missing-costs" };
  }
  if (marginPct === null) return { status: "missing-margin" };

  const { unitCost, variableUnit, totalFixed, volume } = costs;

  const pricing = calculatePricing({ unitCost, variableUnit, totalFixed, volume, marginPct });
  if (!pricing.ok) {
    return pricing.code === "INVALID_MARGIN"
      ? { status: "missing-margin" }
      : { status: "missing-costs" };
  }

  const price = pricing.suggestedPrice;
  const breakEven = calculateBreakEven({ price, variableUnit, totalFixed, volume });
  if (!breakEven.ok) {
    return breakEven.code === "NO_CONTRIBUTION"
      ? { status: "no-contribution" }
      : { status: "missing-costs" };
  }

  const breakEvenUnits = Number(breakEven.breakEvenUnits);
  const chartVolume = Math.max(volume, breakEvenUnits);
  const fixedCost = Number(totalFixed);
  const sales = Number(breakEven.breakEvenSales);

  const pointAt = (units: number): BreakEvenPoint => ({
    units,
    revenue: Number(price) * units,
    totalCost: fixedCost + Number(variableUnit) * units,
    fixedCost,
  });

  // Revenue and total cost are straight lines, so a point at the start, the
  // break-even, the volume and the axis end draws them; x values are unique.
  const byUnits = new Map<number, BreakEvenPoint>([
    [0, pointAt(0)],
    [
      volume,
      {
        ...pointAt(volume),
        revenue: Number(breakEven.revenueAtVolume),
        totalCost: Number(breakEven.totalCostAtVolume),
      },
    ],
    [chartVolume, pointAt(chartVolume)],
  ]);
  const exactUnits = Number(breakEven.breakEvenUnitsExact);
  byUnits.set(exactUnits, { units: exactUnits, revenue: sales, totalCost: sales, fixedCost });

  const points = [...byUnits.values()].sort((a, b) => a.units - b.units);

  return {
    status: "ready",
    volume,
    breakEvenUnits,
    exceedsVolume: breakEvenUnits > volume,
    breakEvenSales: breakEven.breakEvenSales,
    chart: {
      points,
      volume: chartVolume,
      breakEvenUnits,
      breakEvenSales: sales,
      description: `Gráfico de punto de equilibrio. Ingresos y costos totales se cruzan en ${breakEvenUnits} unidades, con ventas de equilibrio de ${formatARS(breakEven.breakEvenSales)}. Los costos fijos son de ${formatARS(totalFixed)} y se mantienen iguales en todas las unidades.`,
    },
  };
}
