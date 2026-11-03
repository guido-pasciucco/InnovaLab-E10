const WIDTH = 560;
const HEIGHT = 300;
const PADDING = { top: 24, right: 18, bottom: 38, left: 58 };

const MAX_UNITS = 100;
const MAX_VALUE = 2_600_000;
const FIXED_COSTS = 180_000;
const UNIT_PRICE = 24_900;
const UNIT_COST = 21_065;
const BREAK_EVEN_UNITS = 47;
const BREAK_EVEN_VALUE = BREAK_EVEN_UNITS * UNIT_PRICE;

const Y_TICKS = [2_600_000, 1_950_000, 1_300_000, 650_000, 0];
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
  return units * UNIT_PRICE;
}

function totalCost(units: number) {
  return FIXED_COSTS + units * UNIT_COST;
}

function moneyLabel(value: number) {
  if (value === 0) {
    return "$0";
  }

  if (value >= 1_000_000) {
    const millions = Math.round((value / 1_000_000) * 100) / 100;
    return `$${String(millions).replace(".", ",")} M`;
  }

  return `$${Math.round(value / 1000)} mil`;
}

export function BreakEvenPreviewChart() {
  const profitArea = [
    `${x(BREAK_EVEN_UNITS)} ${y(revenue(BREAK_EVEN_UNITS))}`,
    `${x(MAX_UNITS)} ${y(revenue(MAX_UNITS))}`,
    `${x(MAX_UNITS)} ${y(totalCost(MAX_UNITS))}`,
  ].join(" L ");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-labelledby="break-even-chart-title break-even-chart-description"
      className="h-auto w-full"
    >
      <title id="break-even-chart-title">Gráfico de punto de equilibrio</title>
      <desc id="break-even-chart-description">
        Los ingresos y los costos totales se cruzan en 47 unidades. Con costos fijos de $180.000,
        costo variable unitario de $21.065 y precio de venta de $24.900, el punto de equilibrio es de
        $1.170.300.
      </desc>

      <defs>
        <linearGradient id="break-even-profit" x1="0" y1="0" x2="0" y2="1">
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

      <path d={`M ${profitArea} Z`} fill="url(#break-even-profit)" />

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
        x1={x(BREAK_EVEN_UNITS)}
        y1={y(BREAK_EVEN_VALUE)}
        x2={x(BREAK_EVEN_UNITS)}
        y2={y(0)}
        stroke="var(--color-action-primary)"
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity="0.5"
      />
      <circle
        cx={x(BREAK_EVEN_UNITS)}
        cy={y(BREAK_EVEN_VALUE)}
        r="4.5"
        fill="var(--color-action-primary)"
        stroke="var(--color-surface)"
        strokeWidth="2"
      />

      <g>
        <rect
          x={x(BREAK_EVEN_UNITS) + 10}
          y={y(BREAK_EVEN_VALUE) - 48}
          width="152"
          height="38"
          rx="9"
          fill="var(--color-surface)"
          stroke="var(--color-border-default)"
        />
        <text
          x={x(BREAK_EVEN_UNITS) + 20}
          y={y(BREAK_EVEN_VALUE) - 33}
          fontSize="9"
          fill="var(--color-fg-muted)"
        >
          Punto de equilibrio
        </text>
        <text
          x={x(BREAK_EVEN_UNITS) + 20}
          y={y(BREAK_EVEN_VALUE) - 19}
          fontSize="11"
          fontWeight="700"
          fill="var(--color-fg)"
        >
          47 unidades
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
          {tick === MAX_UNITS ? "100 u." : tick}
        </text>
      ))}
    </svg>
  );
}
