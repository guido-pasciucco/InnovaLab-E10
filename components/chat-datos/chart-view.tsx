"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartCell, ResolvedChart } from "@/lib/chat-datos/chart-spec";

import { formatChartValue } from "./format";
import { ResultTable } from "./result-table";

// Same palette as the break-even chart, so both read as one product.
const SERIES_COLORS = ["#0a7a12", "#374151", "#64748b"];
const GRID_COLOR = "#e2ebe6";
const AXIS_COLOR = "#cbd5e1";

// Draws the chart the server already checked (resolveChart). The model never
// sends numbers to draw: this only paints what the query returned.
export function ChartView({ chart }: { chart: ResolvedChart }) {
  if (chart.type === "table") {
    return (
      <ResultTable caption={chart.title} columns={chart.columns} rows={chart.data} format={chart.format} />
    );
  }

  const { format, x, y } = chart;
  const data = chart.data.map((row) => ({ ...row }));
  const formatValue = (value: unknown) => formatChartValue(value as ChartCell, format);

  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="2 6" />
      <XAxis dataKey={x} tickLine={false} axisLine={{ stroke: AXIS_COLOR }} tickMargin={8} interval="preserveStartEnd" />
      <YAxis tickLine={false} axisLine={{ stroke: AXIS_COLOR }} width={72} tickFormatter={formatValue} />
      <Tooltip formatter={formatValue} />
      {y.length > 1 && <Legend />}
    </>
  );

  return (
    <div role="img" aria-label={`Gráfico: ${chart.title}`} className="h-[260px] w-full sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        {chart.type === "line" ? (
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }} accessibilityLayer={false}>
            {axes}
            {y.map((column, index) => (
              <Line
                key={column}
                type="monotone"
                dataKey={column}
                stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                strokeWidth={2.5}
                dot={data.length <= 24}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        ) : (
          // A histogram is a bar chart with the bars touching.
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
            barCategoryGap={chart.type === "histogram" ? 0 : "20%"}
            accessibilityLayer={false}
          >
            {axes}
            {y.map((column, index) => (
              <Bar
                key={column}
                dataKey={column}
                fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                radius={chart.type === "histogram" ? 0 : [6, 6, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
