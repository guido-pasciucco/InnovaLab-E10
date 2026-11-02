"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

// Money is formatted before it reaches the chart. These numbers are SVG
// coordinates, not amounts the UI adds up: the break-even values come from the
// calculation engine when the results view is wired to it.
export type BreakEvenPoint = {
  units: number;
  revenue: number;
  totalCost: number;
  fixedCost: number;
};

type BreakEvenChartProps = {
  points: readonly BreakEvenPoint[];
  volume: number;
  breakEvenUnits: number;
  breakEvenSales: number;
  description: string;
};

const REVENUE_COLOR = "#0a7a12";
const TOTAL_COST_COLOR = "#374151";
const FIXED_COST_COLOR = "#6b7280";
const GRID_COLOR = "#e2ebe6";
const GUIDE_COLOR = "#64748b";

export function BreakEvenChart({
  points,
  volume,
  breakEvenUnits,
  breakEvenSales,
  description,
}: BreakEvenChartProps) {
  if (points.length === 0) {
    return null;
  }

  const data = points.map((point) => ({ ...point }));
  const last = data[data.length - 1];
  const maxY =
    Math.max(
      1,
      ...data.flatMap((point) => [
        point.revenue,
        point.totalCost,
        point.fixedCost,
      ]),
    ) * 1.08;

  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={description}
        className="h-[260px] w-full sm:h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 28, right: 92, bottom: 4, left: 0 }}
            accessibilityLayer={false}
          >
            <CartesianGrid
              vertical={false}
              stroke={GRID_COLOR}
              strokeDasharray="2 6"
            />

            <XAxis
              dataKey="units"
              type="number"
              domain={[0, volume]}
              tick={false}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              height={12}
            />
            <YAxis
              type="number"
              domain={[0, maxY]}
              tick={false}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              width={12}
            />

            <Line
              type="linear"
              dataKey="fixedCost"
              name="Costos fijos"
              stroke={FIXED_COST_COLOR}
              strokeWidth={2.5}
              strokeDasharray="6 5"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="totalCost"
              name="Costos totales"
              stroke={TOTAL_COST_COLOR}
              strokeWidth={2.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="revenue"
              name="Ingresos"
              stroke={REVENUE_COLOR}
              strokeWidth={3}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />

            <ReferenceLine
              segment={
                [
                  { x: 0, y: breakEvenSales },
                  { x: breakEvenUnits, y: breakEvenSales },
                ] as const
              }
              stroke={GUIDE_COLOR}
              strokeDasharray="3 4"
              strokeWidth={1.25}
            />
            <ReferenceLine
              segment={
                [
                  { x: breakEvenUnits, y: 0 },
                  { x: breakEvenUnits, y: breakEvenSales },
                ] as const
              }
              stroke={GUIDE_COLOR}
              strokeDasharray="3 4"
              strokeWidth={1.25}
            />

            <ReferenceDot
              x={breakEvenUnits}
              y={breakEvenSales}
              r={6}
              fill="#ffffff"
              stroke={REVENUE_COLOR}
              strokeWidth={3}
              label={{
                value: `Equilibrio: ${breakEvenUnits} u.`,
                position: "top",
                offset: 10,
                fill: REVENUE_COLOR,
                fontSize: 12,
                fontWeight: 600,
              }}
            />

            <ReferenceDot
              x={last.units}
              y={last.revenue}
              r={0}
              fill="none"
              stroke="none"
              label={{
                value: "Ingresos",
                position: "top",
                offset: 8,
                fill: REVENUE_COLOR,
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <ReferenceDot
              x={last.units}
              y={last.totalCost}
              r={0}
              fill="none"
              stroke="none"
              label={{
                value: "Costos totales",
                position: "top",
                offset: 8,
                fill: TOTAL_COST_COLOR,
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <ReferenceDot
              x={last.units}
              y={last.fixedCost}
              r={0}
              fill="none"
              stroke="none"
              label={{
                value: "Costos fijos",
                position: "bottom",
                offset: 8,
                fill: "#6b7280",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
