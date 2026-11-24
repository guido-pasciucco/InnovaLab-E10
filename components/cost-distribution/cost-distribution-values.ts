import Decimal from "decimal.js";

import { formatARS } from "@/lib/money/format";
import type { CostDistribution, CostDistributionRow } from "@/lib/services/cost-distribution";

// Pure mapping for the cost distribution screen (#244, guide P15). The service
// already did the math; this only decides how each figure is written, so no
// formula lives in the component and the wording is testable without
// rendering.

export const NOT_AVAILABLE = "No disponible";

// Why a figure is missing. Every number the screen shows says what it
// represents; when it cannot be computed the screen says "No disponible" and
// the reason, never a misleading $ 0.
const STATUS_MESSAGES = {
  ready: null,
  no_capacity: {
    tone: "warning",
    title: "Falta la capacidad mensual",
    text: "Cargá cuántas unidades pensás fabricar este mes de al menos un producto. Sin capacidad no hay con qué repartir los gastos, así que no mostramos un costo total.",
    action: { href: "/products", label: "Cargar capacidad" },
  },
  no_expenses: {
    tone: "warning",
    title: "Faltan los gastos del período",
    text: "Todavía no cargaste gastos de este mes. Sin ellos no hay nada para repartir entre tus productos, así que no mostramos un costo total.",
    action: { href: "/period-costs", label: "Cargar gastos del período" },
  },
  unavailable: {
    tone: "warning",
    title: "Falta el costo variable de tus productos",
    text: "Los gastos ya se reparten, pero ningún producto tiene su receta completa. Cuando tengan costo variable vas a ver el costo total de cada uno.",
    action: { href: "/products", label: "Completar recetas" },
  },
} as const;

export type DistributionBanner = {
  tone: "warning";
  title: string;
  text: string;
  action: { href: string; label: string };
};

export type DistributionRowView = {
  id: string;
  name: string;
  capacity: string;
  share: string;
  variableUnit: string;
  indirectUnit: string;
  fixedShare: string;
  unitCost: string;
  // Why the total cost is not available for this product, when it is not.
  note: string | null;
  noteHref: string | null;
};

export type DistributionExplanation = {
  totalExpenses: string;
  capacitySum: string;
  // Period expenses over the sum of capacities: what one unit absorbs.
  indirectUnit: string;
};

export type CostDistributionView = {
  periodLabel: string;
  totalExpenses: string;
  banner: DistributionBanner | null;
  rows: DistributionRowView[];
  // Present only when there is a spread to explain.
  explanation: DistributionExplanation | null;
  // A product was left out or has no total while the rest are shown.
  hasPartialRows: boolean;
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

// Written here and not taken from Intl, so the label is the same on every
// runtime (same reasoning as the period expenses screen).
export function formatPeriod(period: string): string {
  const match = PERIOD_KEY.exec(period);
  if (!match) return period;

  return `${MONTHS[Number(match[2]) - 1]} de ${match[1]}`;
}

function money(value: string | null): string {
  if (value === null) return NOT_AVAILABLE;

  return formatARS(value) || NOT_AVAILABLE;
}

// "0.9000" -> "90 %", "0.3333" -> "33,33 %". The participation is shown for
// reading only; the amounts come from the service, not from this percentage.
export function formatShare(share: string | null): string {
  if (share === null) return NOT_AVAILABLE;

  const percent = new Decimal(share).times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return `${percent.toString().replace(".", ",")} %`;
}

function formatCapacity(capacity: number | null): string {
  if (capacity === null || capacity === 0) return "Sin cargar";

  const grouped = String(capacity).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${grouped} u./mes`;
}

function unavailableNote(row: CostDistributionRow): string | null {
  if (!row.absorbsExpenses) {
    return "Sin capacidad mensual: no entra en el reparto.";
  }
  if (row.unitCost !== null) return null;

  switch (row.variableUnavailableCode) {
    case null:
      return "Sin receta: no hay costo variable para sumar.";
    case "MISSING_YIELD":
      return "Falta el rendimiento de la receta.";
    default:
      return "Revisá la receta: no se pudo calcular su costo variable.";
  }
}

function toRowView(row: CostDistributionRow): DistributionRowView {
  return {
    id: row.productId,
    name: row.name,
    capacity: formatCapacity(row.capacity),
    share: formatShare(row.share),
    variableUnit: money(row.variableUnit),
    indirectUnit: money(row.indirectUnit),
    fixedShare: money(row.fixedShare),
    unitCost: money(row.unitCost),
    note: unavailableNote(row),
    noteHref: row.absorbsExpenses ? null : row.editHref,
  };
}

function toExplanation(distribution: CostDistribution): DistributionExplanation | null {
  const absorbing = distribution.rows.filter((row) => row.absorbsExpenses);
  if (absorbing.length === 0) return null;

  const capacitySum = absorbing.reduce((sum, row) => sum + (row.capacity ?? 0), 0);

  return {
    totalExpenses: money(distribution.totalExpenses),
    capacitySum: formatCapacity(capacitySum),
    indirectUnit: money(absorbing[0].indirectUnit),
  };
}

export function toCostDistributionView(distribution: CostDistribution): CostDistributionView {
  const rows = distribution.rows.map(toRowView);
  const message = STATUS_MESSAGES[distribution.status];

  return {
    periodLabel: formatPeriod(distribution.period),
    totalExpenses: money(distribution.totalExpenses),
    banner: message,
    rows,
    explanation: distribution.status === "ready" || distribution.status === "unavailable"
      ? toExplanation(distribution)
      : null,
    hasPartialRows: distribution.status === "ready" && rows.some((row) => row.note !== null),
  };
}
