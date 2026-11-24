import { formatARS } from "@/lib/money/format";
import type {
  BreakEven,
  BreakEvenExcludedProduct,
  BreakEvenStatus,
} from "@/lib/types/break-even";

const STATUS_CONTENT: Record<
  Exclude<BreakEvenStatus, "ready">,
  { title: string; text: string; href?: string; action?: string }
> = {
  no_products: {
    title: "Todavía no cargaste productos",
    text: "Agregá al menos un producto para calcular el punto de equilibrio.",
    href: "/products",
    action: "Ir a productos",
  },
  no_capacity: {
    title: "Falta la capacidad mensual",
    text: "Cargá cuántas unidades pensás fabricar para definir la mezcla de productos.",
    href: "/products",
    action: "Cargar capacidad",
  },
  no_expenses: {
    title: "Faltan los gastos del mes",
    text: "Cargá los gastos del período para calcular cuánto necesitás vender.",
    href: "/period-costs",
    action: "Cargar gastos",
  },
  no_prices: {
    title: "Faltan los precios",
    text: "Definí el margen de tus productos para obtener sus precios de venta.",
    href: "/pricing",
    action: "Ir a precios",
  },
  incomplete: {
    title: "Hay datos pendientes",
    text: "Completá los productos indicados para calcular el equilibrio con toda la mezcla.",
    href: "/products",
    action: "Revisar productos",
  },
  no_break_even: {
    title: "No se alcanza el punto de equilibrio",
    text: "La contribución de la mezcla es cero o negativa. Revisá precios y costos variables.",
    href: "/pricing",
    action: "Revisar precios",
  },
};

const EXCLUSION_MESSAGES = {
  NO_CAPACITY: "Sin capacidad mensual: no participa de la mezcla.",
  NO_VARIABLE_COST: "Sin costo variable: completá su receta.",
  NO_PRICE: "Sin precio: definí su margen.",
} as const;

export type BreakEvenViewRow = {
  id: string;
  name: string;
  price: string;
  variableUnit: string;
  contributionUnit: string;
  marginPct: string;
  mixPct: string;
  quotaWhole: string;
  quotaExact: string;
  hasNegativeContribution: boolean;
};

export type BreakEvenView = {
  period: string;
  status: BreakEvenStatus;
  banner: null | { title: string; text: string; href?: string; action?: string };
  summary: null | { expenses: string; units: string; sales: string };
  rows: BreakEvenViewRow[];
  closingContribution: string | null;
  exclusions: Array<BreakEvenExcludedProduct & { message: string }>;
  hasNegativeContribution: boolean;
};

function decimal(value: string, maximumFractionDigits = 4): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number(value));
}

function percent(value: string): string {
  return `${decimal(value)} %`;
}

export function toBreakEvenView(result: BreakEven): BreakEvenView {
  return {
    period: result.period,
    status: result.status,
    banner: result.status === "ready" ? null : STATUS_CONTENT[result.status],
    summary: result.totals
      ? {
          expenses: formatARS(result.totalExpenses),
          units: `${decimal(result.totals.breakEvenUnitsWhole, 0)} unidades`,
          sales: formatARS(result.totals.breakEvenSales),
        }
      : null,
    rows: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: formatARS(row.price),
      variableUnit: formatARS(row.variableUnit),
      contributionUnit: formatARS(row.contributionUnit),
      marginPct: percent(row.marginPct),
      mixPct: percent(row.mixPct),
      quotaWhole: `${decimal(row.breakEvenUnitsWhole, 0)} u.`,
      quotaExact: `${decimal(row.breakEvenUnits)} u. exactas`,
      hasNegativeContribution: row.hasNegativeContribution,
    })),
    closingContribution: result.totals
      ? formatARS(result.totals.closingContribution)
      : null,
    exclusions: result.excluded.map((product) => ({
      ...product,
      message: EXCLUSION_MESSAGES[product.reason],
    })),
    hasNegativeContribution: result.hasNegativeContribution,
  };
}
