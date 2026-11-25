import type { UIMessageChunk } from "ai";
import { describe, expect, it } from "vitest";

import { readStream } from "../../tests/support/read-stream";
import { createStreamRedactor, redactStream, TOOL_ERROR_TEXT } from "./redact-stream";

const SQL = "select name from products";

const sqlStart: UIMessageChunk = { type: "tool-input-start", toolCallId: "c1", toolName: "run_sql" };
const sqlDelta: UIMessageChunk = { type: "tool-input-delta", toolCallId: "c1", inputTextDelta: `{"sql":"${SQL}` };
const sqlInput: UIMessageChunk = {
  type: "tool-input-available",
  toolCallId: "c1",
  toolName: "run_sql",
  input: { sql: SQL, chart: { type: "table", title: "Productos" } },
};
const sqlOutput: UIMessageChunk = {
  type: "tool-output-available",
  toolCallId: "c1",
  output: { ok: true, sql: SQL, columns: ["name"], rows: [{ name: "Alfajor" }], truncated: false },
};

describe("createStreamRedactor with the SQL hidden", () => {
  it("drops the streamed input deltas of run_sql", () => {
    const redact = createStreamRedactor({ hideSql: true });
    redact(sqlStart);
    expect(redact(sqlDelta)).toBeNull();
  });

  it("removes the sql from the finished input and keeps the chart", () => {
    const redact = createStreamRedactor({ hideSql: true });
    redact(sqlStart);
    expect(redact(sqlInput)).toMatchObject({ input: { chart: { title: "Productos" } } });
    expect(JSON.stringify(redact(sqlInput))).not.toContain(SQL);
  });

  it("removes the sql from the output and keeps the rows", () => {
    const redact = createStreamRedactor({ hideSql: true });
    redact(sqlStart);
    const output = redact(sqlOutput);

    expect(output).toMatchObject({ output: { columns: ["name"], rows: [{ name: "Alfajor" }] } });
    expect(JSON.stringify(output)).not.toContain(SQL);
  });

  it("recognizes run_sql even when the input arrives without a start chunk", () => {
    const redact = createStreamRedactor({ hideSql: true });
    redact(sqlInput);
    expect(JSON.stringify(redact(sqlOutput))).not.toContain(SQL);
  });

  it("does not touch another tool", () => {
    const redact = createStreamRedactor({ hideSql: true });
    const start: UIMessageChunk = { type: "tool-input-start", toolCallId: "c2", toolName: "search_documents" };
    const delta: UIMessageChunk = { type: "tool-input-delta", toolCallId: "c2", inputTextDelta: '{"query":"margen"}' };
    const output: UIMessageChunk = {
      type: "tool-output-available",
      toolCallId: "c2",
      output: { ok: true, sql: "not a query", sources: [] },
    };

    redact(start);
    expect(redact(delta)).toBe(delta);
    expect(redact(output)).toBe(output);
  });

  it("hides the rejected value an input error quotes", () => {
    const redact = createStreamRedactor({ hideSql: true });
    const error: UIMessageChunk = {
      type: "tool-input-error",
      toolCallId: "c3",
      toolName: "run_sql",
      input: { sql: SQL },
      errorText: `Invalid input for tool run_sql: {"sql":"${SQL}"}`,
    };

    const result = redact(error);
    expect(JSON.stringify(result)).not.toContain(SQL);
    expect(result).toMatchObject({ errorText: TOOL_ERROR_TEXT });
  });

  it("passes the rest of the stream through, such as the text", () => {
    const redact = createStreamRedactor({ hideSql: true });
    const text: UIMessageChunk = { type: "text-delta", id: "t1", delta: "Tenés 3 productos." };
    expect(redact(text)).toBe(text);
  });
});

describe("createStreamRedactor with the SQL shown", () => {
  it("lets the SQL through in every chunk", () => {
    const redact = createStreamRedactor({ hideSql: false });
    redact(sqlStart);

    expect(redact(sqlDelta)).toBe(sqlDelta);
    expect(redact(sqlInput)).toBe(sqlInput);
    expect(redact(sqlOutput)).toBe(sqlOutput);
  });
});

describe("tool errors", () => {
  it.each([true, false])("never send the raw error text to the browser (hideSql=%s)", (hideSql) => {
    const redact = createStreamRedactor({ hideSql });
    const error: UIMessageChunk = {
      type: "tool-output-error",
      toolCallId: "c4",
      errorText: "connection to 10.0.0.5:5432 refused",
    };

    expect(redact(error)).toEqual({ type: "tool-output-error", toolCallId: "c4", errorText: TOOL_ERROR_TEXT });
  });
});

describe("redactStream", () => {
  it("applies the filter to a whole stream and drops the deltas", async () => {
    const source = new ReadableStream<UIMessageChunk>({
      start(controller) {
        for (const chunk of [sqlStart, sqlDelta, sqlInput, sqlOutput]) controller.enqueue(chunk);
        controller.close();
      },
    });

    const chunks = await readStream(source.pipeThrough(redactStream({ hideSql: true })));

    expect(chunks.map((chunk) => chunk.type)).toEqual([
      "tool-input-start",
      "tool-input-available",
      "tool-output-available",
    ]);
    expect(JSON.stringify(chunks)).not.toContain(SQL);
  });
});
