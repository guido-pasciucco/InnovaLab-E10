import type { UIMessageChunk } from "ai";

import { RUN_SQL_TOOL } from "./tools";

// Shown instead of the raw error text of a tool. The real error stays in the
// server log: it can carry the query, or details of the infrastructure.
export const TOOL_ERROR_TEXT = "No se pudo consultar ese dato.";

type RedactOptions = {
  // Without CHAT_DATOS_SHOW_SQL the statement never reaches the browser.
  hideSql: boolean;
};

// Filters the UI message stream chunk by chunk before it is sent to the
// browser. Returns the chunk to send, or null to drop it.
//
// The SQL the model writes travels in four places: the streamed deltas of the
// tool input, the finished input, the output (the statement that ran) and the
// text of an input error, which quotes the value it rejected.
export function createStreamRedactor({ hideSql }: RedactOptions) {
  const sqlCalls = new Set<string>();

  return (chunk: UIMessageChunk): UIMessageChunk | null => {
    switch (chunk.type) {
      case "tool-input-start":
        if (chunk.toolName === RUN_SQL_TOOL) sqlCalls.add(chunk.toolCallId);
        return chunk;

      case "tool-input-delta":
        return hideSql && sqlCalls.has(chunk.toolCallId) ? null : chunk;

      case "tool-input-available":
        if (chunk.toolName === RUN_SQL_TOOL) sqlCalls.add(chunk.toolCallId);
        return hideSql && chunk.toolName === RUN_SQL_TOOL ? { ...chunk, input: withoutSql(chunk.input) } : chunk;

      case "tool-input-error":
        if (chunk.toolName === RUN_SQL_TOOL) sqlCalls.add(chunk.toolCallId);
        return {
          ...chunk,
          input: hideSql && chunk.toolName === RUN_SQL_TOOL ? withoutSql(chunk.input) : chunk.input,
          errorText: TOOL_ERROR_TEXT,
        };

      case "tool-output-available":
        return hideSql && sqlCalls.has(chunk.toolCallId) ? { ...chunk, output: withoutSql(chunk.output) } : chunk;

      case "tool-output-error":
        return { ...chunk, errorText: TOOL_ERROR_TEXT };

      default:
        return chunk;
    }
  };
}

// A TransformStream that applies the redactor to a whole stream.
export function redactStream(options: RedactOptions): TransformStream<UIMessageChunk, UIMessageChunk> {
  const redact = createStreamRedactor(options);
  return new TransformStream({
    transform(chunk, controller) {
      const redacted = redact(chunk);
      if (redacted) controller.enqueue(redacted);
    },
  });
}

function withoutSql(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const copy = { ...(value as Record<string, unknown>) };
  delete copy.sql;
  return copy;
}
