import type { ChartCell, ResolvedChart } from "@/lib/chat-datos/chart-spec";
import { formatARS } from "@/lib/money/format";

// How a value of a chart or table is written. Display only: nothing here is
// added up or compared, the numbers come already calculated by the database.
// Built from string operations, not Intl, so the output is the same on every
// machine (same reason as lib/money/format.ts).

const EMPTY = "—";
const GROUP_SEPARATOR = ".";
const DECIMAL_SEPARATOR = ",";

// "1234.50" as the driver returns a numeric column. Needs a fraction: a whole
// number written as text ("2024") is more likely a code or a year than money.
const DECIMAL_TEXT = /^-?\d+\.\d+$/;

type ChartFormat = ResolvedChart["format"];

export function formatChartValue(value: ChartCell | undefined, format: ChartFormat): string {
  if (value === null || value === undefined) return EMPTY;
  if (typeof value === "boolean") return value ? "Sí" : "No";

  if (typeof value === "number") return formatNumber(value, format);
  if (format !== "number" && DECIMAL_TEXT.test(value)) return formatNumber(Number(value), format);
  return value;
}

function formatNumber(value: number, format: ChartFormat): string {
  if (!Number.isFinite(value)) return EMPTY;
  if (format === "currency") return formatARS(value.toFixed(2)) || EMPTY;
  const text = decimalText(value);
  return format === "percent" ? `${text} %` : text;
}

// Up to two decimals, no trailing zeros, dots for thousands, comma for decimals.
function decimalText(value: number): string {
  const fixed = value.toFixed(2);
  // A tiny negative rounds to "-0.00"; it reads as plain zero.
  if (Number(fixed) === 0) return "0";
  const [integer, fraction] = fixed.replace(/\.?0+$/, "").split(".");
  const sign = integer.startsWith("-") ? "-" : "";
  const grouped = integer.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
  return `${sign}${grouped}${fraction ? `${DECIMAL_SEPARATOR}${fraction}` : ""}`;
}
