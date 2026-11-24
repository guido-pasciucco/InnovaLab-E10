import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { simulateReadableStream, type UIMessageChunk } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors/app-error";
import type { AnalystQueryResult } from "@/lib/services/analyst-query";

import { readStream } from "../../tests/support/read-stream";
import {
  LAST_STEP_NOTICE,
  streamChatDatosAnswer,
  STREAM_ERROR_TEXT,
  type ChatDatosAgentOptions,
  type ChatDatosLogEntry,
} from "./agent";
import { CHAT_DATOS_MAX_OUTPUT_TOKENS, CHAT_DATOS_MAX_STEPS } from "./config";
import { TOOL_ERROR_TEXT } from "./redact-stream";

// A scripted model stands in for Bedrock: no AWS, no credentials, no network.

const SQL = "select period, sum(amount_period) as total from business_expenses group by period";

const QUERY_RESULT: AnalystQueryResult = {
  sql: SQL,
  columns: ["period", "total"],
  rows: [
    { period: "2026-09", total: "1000" },
    { period: "2026-10", total: "1200" },
  ],
  truncated: false,
  durationMs: 7,
};

const usage = (input: number, output: number) => ({
  inputTokens: { total: input, noCache: input, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: output, text: output, reasoning: undefined },
});

const toolCallStep = (input: object, id = "call-1", tokens = [10, 5]): LanguageModelV4StreamPart[] => [
  { type: "stream-start", warnings: [] },
  { type: "tool-call", toolCallId: id, toolName: "run_sql", input: JSON.stringify(input) },
  { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage: usage(tokens[0], tokens[1]) },
];

const textStep = (text: string, tokens = [20, 5]): LanguageModelV4StreamPart[] => [
  { type: "stream-start", warnings: [] },
  { type: "text-start", id: "t1" },
  { type: "text-delta", id: "t1", delta: text },
  { type: "text-end", id: "t1" },
  { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage: usage(tokens[0], tokens[1]) },
];

const step = (chunks: LanguageModelV4StreamPart[]) => ({ stream: simulateReadableStream({ chunks }) });

function run(model: MockLanguageModelV4, overrides: Partial<ChatDatosAgentOptions> = {}) {
  const logs: ChatDatosLogEntry[] = [];
  const runSql = vi.fn(async () => QUERY_RESULT);
  const searchDocuments = vi.fn(async () => []);

  const stream = streamChatDatosAnswer({
    model,
    instructions: "Reglas del agente.",
    question: "¿Cuánto gasté por mes?",
    history: [],
    deps: { runSql, searchDocuments },
    showSql: false,
    log: (entry) => logs.push(entry),
    ...overrides,
  });

  return { stream, logs, runSql, searchDocuments };
}

const typesOf = (chunks: UIMessageChunk[]) => chunks.map((chunk) => chunk.type);

describe("streamChatDatosAnswer", () => {
  it("runs the query, streams the answer and logs the question once", async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        step(toolCallStep({ sql: SQL, chart: { type: "bar", title: "Gastos", x: "period", y: ["total"] } })),
        step(textStep("Gastaste $ 1.200 en octubre.")),
      ],
    });
    const { stream, logs, runSql } = run(model);

    const chunks = await readStream(stream);

    expect(runSql).toHaveBeenCalledWith(SQL);
    expect(typesOf(chunks)).toContain("text-delta");
    const output = chunks.find((chunk) => chunk.type === "tool-output-available");
    expect(output).toMatchObject({
      output: { ok: true, columns: ["period", "total"], chart: { type: "bar", x: "period", y: ["total"] } },
    });

    await vi.waitFor(() => expect(logs).toHaveLength(1));
    expect(logs[0]).toEqual({
      question: "¿Cuánto gasté por mes?",
      queries: [{ sql: SQL, rows: 2, truncated: false, durationMs: 7 }],
      searches: 0,
      steps: 2,
      finishReason: "stop",
      inputTokens: 30,
      outputTokens: 10,
      durationMs: expect.any(Number),
    });
  });

  it("keeps the SQL out of the stream but in the log when it is hidden", async () => {
    const model = new MockLanguageModelV4({
      doStream: [step(toolCallStep({ sql: SQL })), step(textStep("Listo."))],
    });
    const { stream, logs } = run(model, { showSql: false });

    const chunks = await readStream(stream);

    expect(JSON.stringify(chunks)).not.toContain("business_expenses");
    expect(typesOf(chunks)).toContain("tool-output-available");
    await vi.waitFor(() => expect(logs[0]?.queries[0]?.sql).toBe(SQL));
  });

  it("sends the SQL to the screen when it is shown", async () => {
    const model = new MockLanguageModelV4({
      doStream: [step(toolCallStep({ sql: SQL })), step(textStep("Listo."))],
    });
    const { stream } = run(model, { showSql: true });

    const chunks = await readStream(stream);

    const input = chunks.find((chunk) => chunk.type === "tool-input-available");
    const output = chunks.find((chunk) => chunk.type === "tool-output-available");
    expect(input).toMatchObject({ input: { sql: SQL } });
    expect(output).toMatchObject({ output: { sql: SQL } });
  });

  it("sends the instructions, the history and the question, with the token limit", async () => {
    const model = new MockLanguageModelV4({ doStream: [step(textStep("Hola."))] });
    const { stream } = run(model, {
      question: "¿y el mes pasado?",
      history: [
        { role: "user", content: "¿cuánto gasté?" },
        { role: "assistant", content: "Gastaste $ 1.200." },
      ],
    });

    await readStream(stream);

    const [call] = model.doStreamCalls;
    expect(call.prompt.map((message) => message.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(JSON.stringify(call.prompt)).toContain("Reglas del agente.");
    expect(JSON.stringify(call.prompt[3])).toContain("¿y el mes pasado?");
    expect(call.maxOutputTokens).toBe(CHAT_DATOS_MAX_OUTPUT_TOKENS);
    expect(call.temperature).toBe(0);
    expect(call.tools?.map((tool) => tool.name).sort()).toEqual(["run_sql", "search_documents"]);
  });

  it("stops after the step limit even if the model never stops asking for the query", async () => {
    let calls = 0;
    const model = new MockLanguageModelV4({
      doStream: async () => step(toolCallStep({ sql: SQL }, `call-${++calls}`)),
    });
    const { stream, runSql, logs } = run(model);

    await readStream(stream);

    expect(model.doStreamCalls).toHaveLength(CHAT_DATOS_MAX_STEPS);
    expect(runSql).toHaveBeenCalledTimes(CHAT_DATOS_MAX_STEPS);
    await vi.waitFor(() => expect(logs[0]?.steps).toBe(CHAT_DATOS_MAX_STEPS));
  });

  it("tells the model to answer on the last step, keeping the tools in the request", async () => {
    let calls = 0;
    const model = new MockLanguageModelV4({
      doStream: async () => step(toolCallStep({ sql: SQL }, `call-${++calls}`)),
    });
    const { stream } = run(model);

    await readStream(stream);

    const system = (index: number) => JSON.stringify(model.doStreamCalls[index].prompt[0]);
    expect(system(0)).not.toContain(LAST_STEP_NOTICE);
    expect(system(CHAT_DATOS_MAX_STEPS - 2)).not.toContain(LAST_STEP_NOTICE);
    expect(system(CHAT_DATOS_MAX_STEPS - 1)).toContain(LAST_STEP_NOTICE);
    // Bedrock refuses tool calls in the history when the request has no tools:
    // the last call keeps them, and never asks for "none".
    for (const call of model.doStreamCalls) {
      expect(call.tools).toHaveLength(2);
      expect(call.toolChoice).not.toEqual({ type: "none" });
    }
  });

  it("gives the model the reason when a query is rejected, so it can fix it", async () => {
    const model = new MockLanguageModelV4({
      doStream: [step(toolCallStep({ sql: "delete from products" })), step(textStep("Corregí la consulta."))],
    });
    const rejection = new AppError("ANALYST_QUERY_REJECTED", { reason: "Solo se permite SELECT." });
    const { stream, logs } = run(model, {
      deps: { runSql: vi.fn().mockRejectedValue(rejection), searchDocuments: vi.fn(async () => []) },
    });

    await readStream(stream);

    expect(JSON.stringify(model.doStreamCalls[1].prompt)).toContain("Solo se permite SELECT.");
    await vi.waitFor(() =>
      expect(logs[0].queries).toEqual([{ sql: "delete from products", error: "ANALYST_QUERY_REJECTED" }]),
    );
  });

  it("counts the document searches", async () => {
    const searchStep: LanguageModelV4StreamPart[] = [
      { type: "stream-start", warnings: [] },
      { type: "tool-call", toolCallId: "s1", toolName: "search_documents", input: JSON.stringify({ query: "margen" }) },
      { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage: usage(5, 5) },
    ];
    const model = new MockLanguageModelV4({ doStream: [step(searchStep), step(textStep("El margen es..."))] });
    const { stream, logs, searchDocuments } = run(model);

    await readStream(stream);

    expect(searchDocuments).toHaveBeenCalledWith("margen");
    await vi.waitFor(() => expect(logs[0]?.searches).toBe(1));
  });

  it("hides the text of a server failure from the browser", async () => {
    const model = new MockLanguageModelV4({
      doStream: [step(toolCallStep({ sql: SQL })), step(textStep("No pude."))],
    });
    const { stream, logs } = run(model, {
      deps: {
        runSql: vi.fn().mockRejectedValue(new Error("connection to 10.0.0.5:5432 refused")),
        searchDocuments: vi.fn(async () => []),
      },
    });

    const chunks = await readStream(stream);

    expect(chunks.find((chunk) => chunk.type === "tool-output-error")).toMatchObject({ errorText: TOOL_ERROR_TEXT });
    expect(JSON.stringify(chunks)).not.toContain("10.0.0.5");
    await vi.waitFor(() => expect(logs[0]?.queries[0]?.error).toBe("UNEXPECTED"));
  });

  it("reports a failing model with a plain message and logs the real reason", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => {
        throw new Error("ThrottlingException for AKIA_TEST_KEY");
      },
    });
    const { stream, logs } = run(model);

    const chunks = await readStream(stream);

    expect(chunks.find((chunk) => chunk.type === "error")).toEqual({ type: "error", errorText: STREAM_ERROR_TEXT });
    expect(JSON.stringify(chunks)).not.toContain("AKIA_TEST_KEY");
    await vi.waitFor(() => expect(logs).toHaveLength(1));
    expect(logs[0]).toMatchObject({ finishReason: "error", error: expect.stringContaining("ThrottlingException") });
  });
});
