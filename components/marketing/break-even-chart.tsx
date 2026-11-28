import { referenceTotals } from "./reference-example";

// Same visual language as the old home preview, now driven by the worked
// example: one "mix unit" is the weighted average of the two presentations.
const WIDTH = 560;
const HEIGHT = 300;
const PADDING = { top: 24, right: 18, bottom: 38, left: 58 };

const MAX_UNITS = 100;
const MAX_VALUE = 100_000;
const FIXED_COSTS = 30_000;
const { weightedPrice, weightedContribution, breakEvenUnits } = referenceTotals;
const weightedUnitCost = weightedPrice - weightedContribution;

const Y_TICKS = [100_000, 75_000, 50_000, 25_000, 0];
const X_TICKS = [0, 25, 50, 75, 100];

function x(units: number) {
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  return PADDING.left + (units / MAX_UNITS) * plotWidth;
}

function y(value: number) {
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  return PADDING.top + (1 - value / MAX_VALUE) * plotHeight;
}

function revenue(units: number) {
  return units * weightedPrice;
}

function totalCost(units: number) {
  return FIXED_COSTS + units * weightedUnitCost;
}

function moneyLabel(value: number) {
  if (value === 0) return "$0";
  return `$${Math.round(value / 1000)} mil`;
}

export function BreakEvenChart() {
  const breakEvenValue = revenue(breakEvenUnits);
  const profitArea = [
    `${x(breakEvenUnits)} ${y(breakEvenValue)}`,
    `${x(MAX_UNITS)} ${y(revenue(MAX_UNITS))}`,
    `${x(MAX_UNITS)} ${y(totalCost(MAX_UNITS))}`,
  ].join(" L ");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-labelledby="reference-chart-title reference-chart-description"
      className="h-auto w-full"
    >
      <title id="reference-chart-title">Gráfico del punto de equilibrio del ejemplo</title>
      <desc id="reference-chart-description">
        Con gastos de 30.000 pesos, los ingresos y los costos totales se cruzan en 62,07 unidades de
        mezcla, lo que equivale a 52.758,62 pesos de ventas.
      </desc>

      <defs>
        <linearGradient id="reference-break-even-profit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-action-primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-action-primary)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {Y_TICKS.map((tick) => (
        <g key={tick}>
          <line
            x1={PADDING.left}
            y1={y(tick)}
            x2={WIDTH - PADDING.right}
            y2={y(tick)}
            stroke="var(--color-border-default)"
            strokeWidth="1"
          />
          <text
            x={PADDING.left - 10}
            y={y(tick) + 4}
            textAnchor="end"
            fontSize="10"
            fontWeight="500"
            fill="var(--color-fg-muted)"
          >
            {moneyLabel(tick)}
          </text>
        </g>
      ))}

      <path d={`M ${profitArea} Z`} fill="url(#reference-break-even-profit)" />

      <line
        x1={x(0)}
        y1={y(FIXED_COSTS)}
        x2={x(MAX_UNITS)}
        y2={y(FIXED_COSTS)}
        stroke="var(--color-warning)"
        strokeWidth="1.6"
        strokeDasharray="5 5"
      />
      <line
        x1={x(0)}
        y1={y(revenue(0))}
        x2={x(MAX_UNITS)}
        y2={y(revenue(MAX_UNITS))}
        stroke="var(--color-action-primary)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <line
        x1={x(0)}
        y1={y(totalCost(0))}
        x2={x(MAX_UNITS)}
        y2={y(totalCost(MAX_UNITS))}
        stroke="var(--color-fg-muted)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      <line
        x1={x(breakEvenUnits)}
        y1={y(breakEvenValue)}
        x2={x(breakEvenUnits)}
        y2={y(0)}
        stroke="var(--color-action-primary)"
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity="0.5"
      />
      <circle
        cx={x(breakEvenUnits)}
        cy={y(breakEvenValue)}
        r="4.5"
        fill="var(--color-action-primary)"
        stroke="var(--color-surface)"
        strokeWidth="2"
      />

      <g>
        <rect
          x={x(breakEvenUnits) + 10}
          y={y(breakEvenValue) - 48}
          width="160"
          height="38"
          rx="9"
          fill="var(--color-surface)"
          stroke="var(--color-border-default)"
        />
        <text x={x(breakEvenUnits) + 20} y={y(breakEvenValue) - 33} fontSize="9" fill="var(--color-fg-muted)">
          Ventas de equilibrio
        </text>
        <text
          x={x(breakEvenUnits) + 20}
          y={y(breakEvenValue) - 19}
          fontSize="11"
          fontWeight="700"
          fill="var(--color-fg)"
        >
          {referenceTotals.breakEvenSales}
        </text>
      </g>

      {X_TICKS.map((tick) => (
        <text
          key={tick}
          x={x(tick)}
          y={HEIGHT - 14}
          textAnchor="middle"
          fontSize="10"
          fontWeight="500"
          fill="var(--color-fg-muted)"
        >
          {tick === MAX_UNITS ? "100 u. de mezcla" : tick}
        </text>
      ))}
    </svg>
  );
}
