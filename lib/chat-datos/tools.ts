import { tool, type JSONValue } from "ai";
import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import type { AnalystQueryResult } from "@/lib/services/analyst-query";
import type { KnowledgeHit } from "@/lib/services/knowledge-search";

import { chartSpecSchema, resolveChart, type ResolvedChart } from "./chart-spec";

// The two tools the agent can call. They take their data sources as
// functions, already tied to the signed-in user by the route, so these tools
// never see a user id and tests run without a database or AWS.
export type ChatDatosToolDeps = {
  searchDocuments: (query: string) => Promise<KnowledgeHit[]>;
  runSql: (sql: string) => Promise<AnalystQueryResult>;
};

export type SearchDocumentsOutput =
  | { ok: true; sources: { source: string; heading: string; content: string }[] }
  | { ok: false; reason: string };

export type RunSqlFailure = "rejected" | "failed" | "timeout";

export type RunSqlOutput =
  | {
      ok: true;
      // The statement that ran. The route drops it unless CHAT_DATOS_SHOW_SQL is on.
      sql: string;
      columns: string[];
      rows: Record<string, unknown>[];
      truncated: boolean;
      durationMs: number;
      chart?: ResolvedChart;
      chartError?: string;
    }
  | { ok: false; error: RunSqlFailure; reason: string };

export const SEARCH_DOCUMENTS_TOOL = "search_documents";
export const RUN_SQL_TOOL = "run_sql";

export function createChatDatosTools(deps: ChatDatosToolDeps) {
  const searchDocuments = tool({
    description:
      "Busca en la documentación del producto: cómo funciona la calculadora, qué significa cada concepto " +
      "(costo fijo, costo variable, margen, punto de equilibrio) y cómo se usa cada paso. " +
      "No tiene datos del usuario: para eso está run_sql.",
    inputSchema: z.object({
      query: z
        .string()
        .trim()
        .min(1)
        .max(2_000)
        .describe("La pregunta o los términos a buscar, en español."),
    }),
    execute: async ({ query }): Promise<SearchDocumentsOutput> => {
      try {
        const hits = await deps.searchDocuments(query);
        return {
          ok: true,
          sources: hits.map((hit) => ({ source: hit.sourcePath, heading: hit.heading, content: hit.content })),
        };
      } catch (err) {
        // Only this one is the model's to report. Anything else is a failure of
        // the server and keeps going up.
        if (err instanceof AppError && err.code === "KNOWLEDGE_UNAVAILABLE") {
          return {
            ok: false,
            reason: "La búsqueda de documentos no está disponible ahora. Decile al usuario que no pudiste consultarla.",
          };
        }
        throw err;
      }
    },
  });

  const runSql = tool({
    description:
      "Ejecuta una consulta SQL de solo lectura sobre los datos del usuario y devuelve las filas. " +
      "Una sola sentencia SELECT (o WITH ... SELECT) sobre las vistas del esquema. " +
      "Devuelve como máximo 30 filas. Si la consulta falla o no está permitida, devuelve el motivo: corregila y reintentá. " +
      "Opcionalmente dibuja un gráfico con las columnas que devuelve la consulta.",
    inputSchema: z.object({
      sql: z.string().describe("La consulta SQL. Una sola sentencia, sin punto y coma al final."),
      chart: chartSpecSchema
        .optional()
        .describe(
          "Gráfico opcional. 'x' son las etiquetas y 'y' las columnas numéricas, ambas del resultado de esta consulta.",
        ),
    }),
    execute: async ({ sql, chart }): Promise<RunSqlOutput> => {
      let result: AnalystQueryResult;
      try {
        result = await deps.runSql(sql);
      } catch (err) {
        const failure = toSqlFailure(err);
        if (failure) return failure;
        throw err;
      }

      const output = {
        ok: true as const,
        sql: result.sql,
        columns: result.columns,
        rows: result.rows,
        truncated: result.truncated,
        durationMs: result.durationMs,
      };
      if (!chart) return output;

      const resolved = resolveChart(chart, result);
      if (resolved.ok) return { ...output, chart: resolved.chart };
      return {
        ...output,
        chartError: `${resolved.reason} Para dibujarlo, volvé a llamar a run_sql con la misma consulta y un gráfico corregido; si no, respondé sin gráfico.`,
      };
    },
    // The screen gets the chart and the full output. The model gets the rows
    // and only whether the chart worked: it does not need the points twice.
    toModelOutput: ({ output }) => {
      if (!output.ok) return { type: "json", value: { error: output.error, reason: output.reason } };
      return {
        type: "json",
        value: {
          columns: output.columns,
          // The driver returns text, numbers, booleans and null: already JSON.
          rows: output.rows as JSONValue,
          truncated: output.truncated,
          ...(output.chart ? { chart: "El gráfico se dibujó en la pantalla." } : {}),
          ...(output.chartError ? { chartError: output.chartError } : {}),
        },
      };
    },
  });

  return { [SEARCH_DOCUMENTS_TOOL]: searchDocuments, [RUN_SQL_TOOL]: runSql };
}

// The three failures of a query the model can act on. Anything else, such as a
// dropped connection, is not the model's mistake and is not handled here.
function toSqlFailure(err: unknown): Extract<RunSqlOutput, { ok: false }> | null {
  if (!(err instanceof AppError)) return null;

  switch (err.code) {
    case "ANALYST_QUERY_REJECTED":
      return { ok: false, error: "rejected", reason: reasonOf(err, "La consulta no está permitida.") };
    case "ANALYST_QUERY_FAILED":
      return { ok: false, error: "failed", reason: reasonOf(err, "La consulta no se pudo ejecutar.") };
    case "ANALYST_QUERY_TIMEOUT":
      return {
        ok: false,
        error: "timeout",
        reason: "La consulta tardó más de lo permitido. Acotala: un solo mes, menos cruces entre vistas.",
      };
    default:
      return null;
  }
}

function reasonOf(err: AppError, fallback: string): string {
  const reason = (err.details as { reason?: unknown } | undefined)?.reason;
  return typeof reason === "string" && reason.length > 0 ? reason : fallback;
}
