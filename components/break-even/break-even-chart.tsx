"use client";

import { useId } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BreakEvenChartData } from "@/lib/calc/buildBreakEvenChart";
import { formatARS, formatARSCompact } from "@/lib/money/format";

const REVENUE_COLOR = "var(--color-action-primary)";
const TOTAL_COSTS_COLOR = "var(--color-fg-muted)";
const FIXED_COSTS_COLOR = "var(--color-warning)";

type PlotPoint = {
  sales: number;
  revenue: number;
  totalCosts: number;
  fixedCosts: number;
};

function toPlotPoints(data: BreakEvenChartData): PlotPoint[] {
  return data.points.map((point) => ({
    sales: Number(point.sales),
    revenue: Number(point.revenue),
    totalCosts: Number(point.totalCosts),
    fixedCosts: Number(point.fixedCosts),
  }));
}

function moneyTick(value: number): string {
  return formatARSCompact(String(value));
}

type BreakEvenChartProps = {
  data: BreakEvenChartData;
};

/**
 * Chart of the break-even point (#247). Receives the result of
 * buildBreakEvenChart: the dashboard only renders it when the view is ready.
 */
export function BreakEvenChart({ data }: BreakEvenChartProps) {
  const points = toPlotPoints(data);
  const crossing = Number(data.breakEven.sales);
  const max = Number(data.range.max);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <figure className="rounded-2xl border border-border-default bg-surface p-4 sm:p-6">
      <figcaption className="mb-4">
        <h3 id={titleId} className="text-sm font-semibold text-fg">
          Punto de equilibrio
        </h3>
        <p id={descriptionId} className="mt-1 text-xs text-fg-muted">
          Ventas en pesos de la mezcla. El cruce marca desde qué nivel de ventas el negocio deja de
          perder.
        </p>
      </figcaption>

      <div
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="h-72 w-full sm:h-80"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 20, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--color-border-default)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="sales"
              type="number"
              domain={[0, max]}
              tickFormatter={moneyTick}
              tick={{ fontSize: 11 }}
              stroke="var(--color-fg-muted)"
            />
            <YAxis
              tickFormatter={moneyTick}
              tick={{ fontSize: 11 }}
              stroke="var(--color-fg-muted)"
              width={64}
            />
            <Tooltip
              formatter={(value, name) => [formatARS(String(value)), String(name)]}
              labelFormatter={(label) => `Ventas: ${formatARS(String(label))}`}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border-default)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-fg)" }}
              itemStyle={{ color: "var(--color-fg)" }}
            />
            <Line
              type="linear"
              dataKey="revenue"
              name="Ingresos"
              stroke={REVENUE_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="totalCosts"
              name="Costos totales"
              stroke={TOTAL_COSTS_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="fixedCosts"
              name="Gastos fijos"
              stroke={FIXED_COSTS_COLOR}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={crossing}
              y={crossing}
              r={5}
              fill={REVENUE_COLOR}
              stroke="var(--color-surface)"
              strokeWidth={2}
              label={{
                value: `Equilibrio · ${formatARSCompact(data.breakEven.sales)}`,
                position: "top",
                // Halo in the surface colour so the label stays readable where
                // the total-costs line crosses it.
                content: ({ x, y, value }) => (
                  <text
                    x={Number(x)}
                    y={Number(y)}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--color-fg)"
                    stroke="var(--color-surface)"
                    strokeWidth={4}
                    paintOrder="stroke"
                  >
                    {String(value ?? "")}
                  </text>
                ),
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-fg-muted">
        <li className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0.5 w-4 rounded-full"
            style={{ backgroundColor: REVENUE_COLOR }}
          />
          Ingresos
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0.5 w-4 rounded-full"
            style={{ backgroundColor: TOTAL_COSTS_COLOR }}
          />
          Costos totales
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0 w-4 border-t-2 border-dashed"
            style={{ borderColor: FIXED_COSTS_COLOR }}
          />
          Gastos fijos
        </li>
      </ul>

      <p className="mt-2 text-center text-xs text-fg-muted">
        Equilibrio: <strong className="font-semibold text-fg">{formatARS(data.breakEven.sales)}</strong>{" "}
        en ventas.
      </p>

      {/* Alternative representation for screen readers. */}
      <table className="sr-only">
        <caption>Puntos del gráfico del punto de equilibrio</caption>
        <thead>
          <tr>
            <th scope="col">Ventas</th>
            <th scope="col">Ingresos</th>
            <th scope="col">Costos totales</th>
            <th scope="col">Gastos fijos</th>
          </tr>
        </thead>
        <tbody>
          {data.points.map((point) => (
            <tr key={point.sales}>
              <th scope="row">{formatARS(point.sales)}</th>
              <td>{formatARS(point.revenue)}</td>
              <td>{formatARS(point.totalCosts)}</td>
              <td>{formatARS(point.fixedCosts)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
