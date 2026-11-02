const labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"] as const;

const currentPrice = [10_050, 20_100, 30_150, 40_200, 50_250, 60_300];
const suggestedPrice = [115_050, 230_100, 345_150, 460_200, 575_250, 690_300];

const WIDTH = 560;
const HEIGHT = 260;
const PADDING = { top: 22, right: 18, bottom: 34, left: 54 };
const MAX_VALUE = 750_000;
const Y_TICKS = [750_000, 500_000, 250_000, 0];

function x(index: number) {
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  return PADDING.left + (index / (labels.length - 1)) * plotWidth;
}

function y(value: number) {
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  return PADDING.top + (1 - value / MAX_VALUE) * plotHeight;
}

function linePath(values: readonly number[]) {
  return values.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`).join(" ");
}

function areaPath(values: readonly number[]) {
  return `${linePath(values)} L ${x(values.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
}

function shortAmount(value: number) {
  return `$${Math.round(value / 1000)} mil`;
}

export function HeroChart() {
  const calloutX = x(3);
  const calloutY = y(currentPrice[3]) - 52;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-labelledby="hero-chart-title hero-chart-description"
      className="h-auto w-full"
    >
      <title id="hero-chart-title">Ganancia acumulada con el precio actual y con el precio sugerido</title>
      <desc id="hero-chart-description">
        Con el precio actual de $21.400, la ganancia acumulada a junio es de $60.300. Con el precio
        sugerido de $24.900, la ganancia acumulada a junio es de $690.300.
      </desc>

      <defs>
        <linearGradient id="hero-chart-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B6B4F" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0B6B4F" stopOpacity="0" />
        </linearGradient>
      </defs>

      {Y_TICKS.map((tick) => (
        <g key={tick}>
          <line
            x1={PADDING.left}
            y1={y(tick)}
            x2={WIDTH - PADDING.right}
            y2={y(tick)}
            stroke="#E4EEE8"
            strokeWidth="1"
          />
          <text
            x={PADDING.left - 10}
            y={y(tick) + 4}
            textAnchor="end"
            fontSize="10"
            fontWeight="500"
            fill="#7A8D84"
          >
            {tick === 0 ? "$0" : shortAmount(tick)}
          </text>
        </g>
      ))}

      <path d={areaPath(suggestedPrice)} fill="url(#hero-chart-area)" />
      <path
        d={linePath(currentPrice)}
        fill="none"
        stroke="#C4544A"
        strokeWidth="2"
        strokeDasharray="6 6"
        strokeLinecap="round"
      />
      <path
        d={linePath(suggestedPrice)}
        fill="none"
        stroke="#0B6B4F"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {suggestedPrice.map((value, index) => (
        <circle
          key={`suggested-${labels[index]}`}
          cx={x(index)}
          cy={y(value)}
          r="3.2"
          fill="#FFFFFF"
          stroke="#0B6B4F"
          strokeWidth="2"
        />
      ))}

      <line
        x1={calloutX}
        y1={y(currentPrice[3])}
        x2={calloutX}
        y2={y(0)}
        stroke="#C4544A"
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity="0.45"
      />
      <circle cx={calloutX} cy={y(currentPrice[3])} r="4" fill="#C4544A" stroke="#FFFFFF" strokeWidth="2" />

      <g>
        <rect
          x={calloutX - 58}
          y={calloutY}
          width="116"
          height="38"
          rx="9"
          fill="#FFFFFF"
          stroke="#E4EEE8"
        />
        <text x={calloutX} y={calloutY + 15} textAnchor="middle" fontSize="9" fill="#7A8D84">
          Precio actual
        </text>
        <text
          x={calloutX}
          y={calloutY + 29}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#122B22"
        >
          $40.200 acum.
        </text>
      </g>

      {labels.map((label, index) => (
        <text
          key={label}
          x={x(index)}
          y={HEIGHT - 10}
          textAnchor="middle"
          fontSize="10"
          fontWeight="500"
          fill="#7A8D84"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}
