import { describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors/app-error";
import type { AnalystQueryResult } from "@/lib/services/analyst-query";

import type { ChartSpec } from "./chart-spec";
import {
  createChatDatosTools,
  type ChatDatosToolDeps,
  type RunSqlOutput,
  type SearchDocumentsOutput,
} from "./tools";

const QUERY_RESULT: AnalystQueryResult = {
  sql: "select period, sum(amount_period) as total from business_expenses group by period",
  columns: ["period", "total"],
  rows: [
    { period: "2026-09", total: "1000.50" },
    { period: "2026-10", total: "1200" },
  ],
  truncated: false,
  durationMs: 12,
};

// The deps are plain functions, so no database, no AWS and no model are involved.
function setup(overrides: Partial<ChatDatosToolDeps> = {}) {
  const deps: ChatDatosToolDeps = {
    searchDocuments: vi.fn(async () => []),
    runSql: vi.fn(async () => QUERY_RESULT),
    ...overrides,
  };
  const tools = createChatDatosTools(deps);
  const options = { toolCallId: "call-1", messages: [], context: {} };

  return {
    deps,
    tools,
    search: async (query: string) =>
      (await tools.search_documents.execute!({ query }, options)) as SearchDocumentsOutput,
    sql: async (input: Parameters<NonNullable<typeof tools.run_sql.execute>>[0]) =>
      (await tools.run_sql.execute!(input, options)) as RunSqlOutput,
  };
}

const BAR_CHART: ChartSpec = { type: "bar", title: "Gastos por mes", x: "period", y: ["total"], format: "currency" };

describe("search_documents", () => {
  it("returns the fragments with their source", async () => {
    const { search, deps } = setup({
      searchDocuments: vi.fn(async () => [
        { sourcePath: "docs/producto/01.md", heading: "Margen", content: "El margen se mide sobre el precio." },
      ]),
    });

    expect(await search("¿cómo se mide el margen?")).toEqual({
      ok: true,
      sources: [{ source: "docs/producto/01.md", heading: "Margen", content: "El margen se mide sobre el precio." }],
    });
    expect(deps.searchDocuments).toHaveBeenCalledWith("¿cómo se mide el margen?");
  });

  it("tells the model when the search is unavailable, instead of failing the answer", async () => {
    const { search } = setup({
      searchDocuments: vi.fn(async () => {
        throw new AppError("KNOWLEDGE_UNAVAILABLE");
      }),
    });

    expect(await search("margen")).toMatchObject({ ok: false, reason: expect.stringContaining("no está disponible") });
  });

  it("lets any other error go up", async () => {
    const boom = new Error("bedrock throttled");
    const { search } = setup({ searchDocuments: vi.fn().mockRejectedValue(boom) });

    await expect(search("margen")).rejects.toBe(boom);
  });
});

describe("run_sql", () => {
  it("returns the rows and the statement that ran", async () => {
    const { sql, deps } = setup();

    expect(await sql({ sql: "select 1" })).toEqual({ ok: true, ...QUERY_RESULT });
    expect(deps.runSql).toHaveBeenCalledWith("select 1");
  });

  it("adds the resolved chart when the description matches the columns", async () => {
    const { sql } = setup();
    const output = await sql({ sql: "select 1", chart: BAR_CHART });

    expect(output).toMatchObject({
      ok: true,
      chart: {
        type: "bar",
        x: "period",
        y: ["total"],
        format: "currency",
        data: [
          { period: "2026-09", total: 1000.5 },
          { period: "2026-10", total: 1200 },
        ],
      },
    });
  });

  it("keeps the rows and explains the problem when the chart does not match", async () => {
    const { sql } = setup();
    const output = await sql({ sql: "select 1", chart: { ...BAR_CHART, y: ["ganancia"] } });

    expect(output).toMatchObject({ ok: true, rows: QUERY_RESULT.rows });
    expect(output).not.toHaveProperty("chart");
    expect(output).toMatchObject({ chartError: expect.stringContaining('"ganancia"') });
    expect((output as { chartError: string }).chartError).toContain("period, total");
  });

  it.each([
    ["ANALYST_QUERY_REJECTED", "rejected", "Solo se permite SELECT."],
    ["ANALYST_QUERY_FAILED", "failed", 'la columna "foo" no existe'],
  ] as const)("returns %s as a reason the model can fix", async (code, error, reason) => {
    const { sql } = setup({
      runSql: vi.fn(async () => {
        throw new AppError(code, { reason });
      }),
    });

    expect(await sql({ sql: "delete from products" })).toEqual({ ok: false, error, reason });
  });

  it("falls back to a generic reason when the error carries none", async () => {
    const { sql } = setup({
      runSql: vi.fn(async () => {
        throw new AppError("ANALYST_QUERY_REJECTED");
      }),
    });

    expect(await sql({ sql: "x" })).toMatchObject({ ok: false, error: "rejected", reason: expect.any(String) });
  });

  it("returns a timeout with advice to narrow the query", async () => {
    const { sql } = setup({
      runSql: vi.fn(async () => {
        throw new AppError("ANALYST_QUERY_TIMEOUT");
      }),
    });

    expect(await sql({ sql: "x" })).toMatchObject({ ok: false, error: "timeout", reason: expect.stringContaining("Acotala") });
  });

  it("lets an error that is not the query's fault go up", async () => {
    const boom = new Error("connection lost");
    const { sql } = setup({ runSql: vi.fn().mockRejectedValue(boom) });
    await expect(sql({ sql: "select 1" })).rejects.toBe(boom);

    const other = new AppError("KNOWLEDGE_UNAVAILABLE");
    const { sql: sqlOther } = setup({ runSql: vi.fn().mockRejectedValue(other) });
    await expect(sqlOther({ sql: "select 1" })).rejects.toBe(other);
  });
});

describe("run_sql: what the model sees", () => {
  const modelOutput = async (output: RunSqlOutput) => {
    const { tools } = setup();
    return tools.run_sql.toModelOutput!({ toolCallId: "call-1", input: { sql: "x" }, output });
  };

  it("gets the rows but not the statement or the chart points", async () => {
    const { sql } = setup();
    const withChart = await sql({ sql: "select 1", chart: BAR_CHART });

    const seen = await modelOutput(withChart);

    expect(seen).toEqual({
      type: "json",
      value: {
        columns: QUERY_RESULT.columns,
        rows: QUERY_RESULT.rows,
        truncated: false,
        chart: expect.stringContaining("se dibujó"),
      },
    });
    expect(JSON.stringify(seen)).not.toContain("business_expenses");
    expect(JSON.stringify(seen)).not.toContain("1000.5,");
  });

  it("gets the chart error so it can correct the chart", async () => {
    const seen = await modelOutput({ ...QUERY_RESULT, ok: true, chartError: "La columna x no existe." });
    expect(seen).toMatchObject({ value: { chartError: "La columna x no existe." } });
  });

  it("gets the failure reason", async () => {
    const seen = await modelOutput({ ok: false, error: "rejected", reason: "Solo SELECT." });
    expect(seen).toEqual({ type: "json", value: { error: "rejected", reason: "Solo SELECT." } });
  });
});
