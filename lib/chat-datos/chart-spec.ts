import { z } from "zod";

// The model never sends chart data: it describes a chart (type, title, which
// columns) and the server checks that description against the rows the SQL
// just returned. What reaches the screen is the resolved chart, never the
// model's raw text, so a made-up column cannot draw anything.

export const CHART_TYPES = ["bar", "line", "histogram", "table"] as const;
export const CHART_FORMATS = ["number", "currency", "percent"] as const;

const MAX_SERIES = 3;
const MAX_TABLE_COLUMNS = 8;

// Shape only. Which fields each type needs, and whether the columns exist,
// is checked in resolveChart so the model gets a reason it can act on.
export const chartSpecSchema = z.object({
  type: z.enum(CHART_TYPES, { error: "El tipo de gráfico tiene que ser bar, line, histogram o table." }),
  title: z
    .string({ error: "Falta el título del gráfico." })
    .trim()
    .min(1, "Falta el título del gráfico.")
    .max(120, "El título del gráfico es demasiado largo."),
  // Column with the labels of the horizontal axis (bar, line, histogram).
  x: z.string().optional(),
  // Numeric columns to draw: one for a histogram, up to three for bar and line.
  y: z
    .array(z.string())
    .min(1, "'y' necesita al menos una columna.")
    .max(MAX_SERIES, `'y' admite hasta ${MAX_SERIES} columnas.`)
    .optional(),
  // Columns to show in a table. Every column of the result when omitted.
  columns: z
    .array(z.string())
    .min(1, "'columns' necesita al menos una columna.")
    .max(MAX_TABLE_COLUMNS, `'columns' admite hasta ${MAX_TABLE_COLUMNS} columnas.`)
    .optional(),
  // How the numbers are written on the screen.
  format: z.enum(CHART_FORMATS, { error: "El formato tiene que ser number, currency o percent." }).default("number"),
});

export type ChartSpec = z.infer<typeof chartSpecSchema>;

export type ChartCell = string | number | boolean | null;
export type ChartRow = Record<string, ChartCell>;

export type ResolvedChart =
  | {
      type: "bar" | "line" | "histogram";
      title: string;
      format: (typeof CHART_FORMATS)[number];
      x: string;
      y: string[];
      data: ChartRow[];
    }
  | {
      type: "table";
      title: string;
      format: (typeof CHART_FORMATS)[number];
      columns: string[];
      data: ChartRow[];
    };

export type ChartResult = { ok: true; chart: ResolvedChart } | { ok: false; reason: string };

export type ChartSource = {
  columns: string[];
  rows: Record<string, unknown>[];
};

// Checks the model's description against the query result. On success, the
// chart carries only the columns it uses, with the y values already numbers.
export function resolveChart(input: unknown, source: ChartSource): ChartResult {
  const parsed = chartSpecSchema.safeParse(input);
  if (!parsed.success) {
    return reject(parsed.error.issues[0]?.message ?? "La especificación del gráfico no es válida.");
  }
  const spec = parsed.data;

  if (source.rows.length === 0) {
    return reject("La consulta no devolvió filas, así que no hay nada para graficar. Respondé solo con texto.");
  }

  return spec.type === "table" ? resolveTable(spec, source) : resolveSeries(spec, source);
}

function resolveTable(spec: ChartSpec, source: ChartSource): ChartResult {
  const columns = spec.columns ?? source.columns;

  const unknown = columns.find((column) => !source.columns.includes(column));
  if (unknown !== undefined) return reject(unknownColumn(unknown, source.columns));

  return {
    ok: true,
    chart: {
      type: "table",
      title: spec.title,
      format: spec.format,
      columns,
      data: source.rows.map((row) => Object.fromEntries(columns.map((column) => [column, toCell(row[column])]))),
    },
  };
}

function resolveSeries(spec: ChartSpec, source: ChartSource): ChartResult {
  const { x, y } = spec;
  if (!x) return reject("Falta 'x': la columna con las etiquetas del eje horizontal.");
  if (!y) return reject("Falta 'y': las columnas numéricas que se dibujan.");
  if (spec.type === "histogram" && y.length !== 1) {
    return reject("Un histograma lleva una sola columna en 'y': la cantidad de cada rango.");
  }

  const unknown = [x, ...y].find((column) => !source.columns.includes(column));
  if (unknown !== undefined) return reject(unknownColumn(unknown, source.columns));

  if (y.includes(x)) return reject(`La columna "${x}" no puede estar en 'x' y en 'y' a la vez.`);
  if (new Set(y).size !== y.length) return reject("'y' repite una columna.");

  const data: ChartRow[] = [];
  for (const row of source.rows) {
    const point: ChartRow = { [x]: toLabel(row[x]) };
    for (const column of y) {
      const value = toNumber(row[column]);
      if (value === INVALID) {
        return reject(`La columna "${column}" tiene un valor que no es un número (${describe(row[column])}). Para 'y' elegí columnas numéricas.`);
      }
      point[column] = value;
    }
    data.push(point);
  }

  return {
    ok: true,
    chart: { type: spec.type as "bar" | "line" | "histogram", title: spec.title, format: spec.format, x, y, data },
  };
}

const INVALID = Symbol("not a number");

// The driver returns numeric columns as text ("1234.50"). This is for drawing
// only; money is never calculated with Number.
function toNumber(value: unknown): number | null | typeof INVALID {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : INVALID;
  if (typeof value !== "string" || value.trim() === "") return INVALID;
  const number = Number(value);
  return Number.isFinite(number) ? number : INVALID;
}

function toLabel(value: unknown): string {
  return value === null || value === undefined ? "Sin dato" : String(value);
}

function toCell(value: unknown): ChartCell {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function describe(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 30 ? `${text.slice(0, 30)}...` : text;
}

function unknownColumn(name: string, available: string[]): string {
  return `La columna "${name}" no está en el resultado de la consulta. Columnas disponibles: ${available.join(", ")}.`;
}

function reject(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}
