import Decimal from "decimal.js";

import { formatARS } from "@/lib/money/format";
import type { CostDistributionStatus } from "@/lib/services/cost-distribution";
import type { Pricing, PricingRow } from "@/lib/types/pricing";

// Pure mapping for the pricing screen (#312). The service already did the
// math; this only decides how each figure is written, so no formula lives in
// the component and the wording is testable without rendering.

export const NOT_AVAILABLE = "No disponible";

export type PricingBanner = {
  tone: "warning";
  title: string;
  text: string;
  action: { href: string; label: string };
};

export type PricingRowView = {
  id: string;
  name: string;
  unitCost: string;
  markupSource: "product" | "business" | "none";
  markupDisplay: string;
  markupSourceLabel: string;
  // Editable value: only an own markup seeds the input. A row using the
  // business default starts empty so saving it does not silently make it own.
  markupInput: string;
  suggestedPrice: string;
  profit: string;
  realMargin: string;
  note: string | null;
};

export type PricingView = {
  periodLabel: string;
  defaultMarkupPercent: string | null;
  banner: PricingBanner | null;
  rows: PricingRowView[];
  hasProducts: boolean;
};

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const PERIOD_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function formatPeriod(period: string): string {
  const match = PERIOD_KEY.exec(period);
  if (!match) return period;

  return `${MONTHS[Number(match[2]) - 1]} de ${match[1]}`;
}

// Markup percentages are stored as numbers ("30.00" = 30 %). Two decimals
// and a decimal comma, as the issue requires.
export function formatMarkup(value: string | null): string {
  if (value === null) return NOT_AVAILABLE;

  const percent = new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
  return `${percent.replace(".", ",")} %`;
}

// Value for the editable input: decimal point, two decimals, no % sign.
export function formatMarkupInput(value: string | null): string {
  const formatted = formatMarkup(value);
  return formatted === NOT_AVAILABLE ? "" : formatted.replace(" %", "").replace(",", ".");
}

// The engine returns exact decimals; formatARS only accepts two. Rounding
// happens here, at display time, never inside lib/calc.
function money(value: string | null): string {
  if (value === null) return NOT_AVAILABLE;

  const rounded = new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
  return formatARS(rounded) || NOT_AVAILABLE;
}

// The service already returns the real margin as a percentage with 4 decimals.
function realMargin(value: string | null): string {
  if (value === null) return NOT_AVAILABLE;

  const percent = new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
  return `${percent.replace(".", ",")} %`;
}

function unavailableNote(row: PricingRow): string | null {
  if (row.unavailableCode === "NO_TOTAL_COST") {
    if (row.capacity === null || row.capacity <= 0) {
      return "Sin capacidad mensual: no entra en el reparto.";
    }
    switch (row.variableUnavailableCode) {
      case null:
        return "Sin receta: no hay costo variable para sumar.";
      case "MISSING_YIELD":
        return "Falta el rendimiento de la receta.";
      default:
        return "Revisá la receta: no se pudo calcular su costo variable.";
    }
  }

  if (row.unavailableCode === "NO_MARKUP" || row.unavailableCode === "INVALID_MARKUP") {
    return "Cargá un recargo para ver el precio sugerido.";
  }

  return null;
}

const SOURCE_LABEL = {
  product: "Propio",
  business: "Del negocio",
  none: "Sin cargar",
} as const;

function toRowView(row: PricingRow): PricingRowView {
  return {
    id: row.productId,
    name: row.name,
    unitCost: money(row.unitCost),
    markupSource: row.markupSource,
    markupDisplay: formatMarkup(row.markupPercent),
    markupSourceLabel: SOURCE_LABEL[row.markupSource],
    markupInput: row.markupSource === "product" ? formatMarkupInput(row.markupPercent) : "",
    suggestedPrice: money(row.price),
    profit: money(row.profitUnit),
    realMargin: realMargin(row.realMarginPct),
    note: unavailableNote(row),
  };
}

const STATUS_MESSAGES: Record<Exclude<CostDistributionStatus, "ready">, PricingBanner> = {
  no_capacity: {
    tone: "warning",
    title: "Falta la capacidad mensual",
    text: "Cargá cuántas unidades pensás fabricar este mes de al menos un producto. Sin capacidad no hay con qué repartir los gastos, así que no mostramos un costo total ni un precio.",
    action: { href: "/products", label: "Cargar capacidad" },
  },
  no_expenses: {
    tone: "warning",
    title: "Faltan los gastos del período",
    text: "Todavía no cargaste gastos de este mes. Sin ellos no hay nada para repartir entre tus productos, así que no mostramos un precio sugerido.",
    action: { href: "/period-costs", label: "Cargar gastos del período" },
  },
  unavailable: {
    tone: "warning",
    title: "Falta el costo variable de tus productos",
    text: "Los gastos ya se reparten, pero ningún producto tiene su receta completa. Cuando tengan costo variable vas a ver el precio sugerido de cada uno.",
    action: { href: "/products", label: "Completar recetas" },
  },
};

export function toPricingView(pricing: Pricing): PricingView {
  return {
    periodLabel: formatPeriod(pricing.period),
    defaultMarkupPercent: pricing.defaultMarkupPercent,
    banner: pricing.status === "ready" ? null : STATUS_MESSAGES[pricing.status],
    rows: pricing.rows.map(toRowView),
    hasProducts: pricing.rows.length > 0,
  };
}
