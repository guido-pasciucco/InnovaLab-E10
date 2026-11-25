import { isStepCount, streamText, type LanguageModel, type UIMessageChunk } from "ai";

import { AppError } from "@/lib/errors/app-error";

import { CHAT_DATOS_MAX_OUTPUT_TOKENS, CHAT_DATOS_MAX_STEPS } from "./config";
import { redactStream } from "./redact-stream";
import type { ChatHistoryMessage } from "./request";
import { createChatDatosTools, type ChatDatosToolDeps } from "./tools";

// What the browser sees when the stream fails midway. The reason goes to the log.
export const STREAM_ERROR_TEXT = "No pude completar la respuesta. Probá de nuevo en unos minutos.";

export const LAST_STEP_NOTICE =
  "ÚLTIMO PASO: no llames más herramientas. Respondé ahora con lo que ya tenés. " +
  "Si falta algún dato, decile al usuario qué no pudiste obtener y sugerile una pregunta más específica.";

export type ChatDatosQueryLog = {
  sql: string;
  rows?: number;
  truncated?: boolean;
  durationMs?: number;
  // ErrorCode of the rejection, or UNEXPECTED for anything else.
  error?: string;
};

// One line per question: what was asked, what ran, how long it took and what it
// cost. The SQL lives here and not on the screen unless CHAT_DATOS_SHOW_SQL is on.
export type ChatDatosLogEntry = {
  question: string;
  queries: ChatDatosQueryLog[];
  searches: number;
  steps: number;
  finishReason: string;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  durationMs: number;
  error?: string;
};

export type ChatDatosAgentOptions = {
  model: LanguageModel;
  instructions: string;
  question: string;
  history: ChatHistoryMessage[];
  deps: ChatDatosToolDeps;
  showSql: boolean;
  abortSignal?: AbortSignal;
  log?: (entry: ChatDatosLogEntry) => void;
};

const defaultLog = (entry: ChatDatosLogEntry): void => {
  console.info("[chat-datos]", JSON.stringify(entry));
};

// Runs one question through the model with the two tools and returns the UI
// message stream for the browser. The loop stops after CHAT_DATOS_MAX_STEPS
// model calls, and each call writes at most CHAT_DATOS_MAX_OUTPUT_TOKENS.
export function streamChatDatosAnswer(options: ChatDatosAgentOptions): ReadableStream<UIMessageChunk> {
  const { model, instructions, question, history, showSql, abortSignal, log = defaultLog } = options;
  const started = performance.now();
  const queries: ChatDatosQueryLog[] = [];
  let searches = 0;
  let logged = false;

  // The log is written once, whichever way the run ends.
  const finish = (summary: Pick<ChatDatosLogEntry, "steps" | "finishReason" | "inputTokens" | "outputTokens"> & { error?: string }) => {
    if (logged) return;
    logged = true;
    log({ question, queries, searches, durationMs: Math.round(performance.now() - started), ...summary });
  };

  // The tools only know the functions they are given: wrapping them records
  // each query without the tools or the model having to know about the log.
  const tools = createChatDatosTools({
    searchDocuments: async (query) => {
      searches += 1;
      return options.deps.searchDocuments(query);
    },
    runSql: async (sql) => {
      try {
        const result = await options.deps.runSql(sql);
        queries.push({ sql: result.sql, rows: result.rows.length, truncated: result.truncated, durationMs: result.durationMs });
        return result;
      } catch (err) {
        queries.push({ sql, error: err instanceof AppError ? err.code : "UNEXPECTED" });
        throw err;
      }
    },
  });

  const result = streamText({
    model,
    instructions,
    messages: [...history.map(({ role, content }) => ({ role, content })), { role: "user", content: question }],
    tools,
    stopWhen: isStepCount(CHAT_DATOS_MAX_STEPS),
    // On the last step the model is told to answer with what it has. The tools
    // stay in the request on purpose: Bedrock refuses a conversation that
    // already holds tool calls when the request carries no tool definitions,
    // and the SDK's `toolChoice: "none"` is sent to Bedrock exactly like that.
    // If the model asks for a tool anyway, the step limit still ends the run.
    prepareStep: ({ stepNumber }) =>
      stepNumber >= CHAT_DATOS_MAX_STEPS - 1 ? { instructions: `${instructions}\n\n${LAST_STEP_NOTICE}` } : {},
    maxOutputTokens: CHAT_DATOS_MAX_OUTPUT_TOKENS,
    // SQL should not vary between runs of the same question.
    temperature: 0,
    maxRetries: 1,
    abortSignal,
    onFinish: (event) =>
      finish({
        steps: event.steps.length,
        finishReason: event.finishReason,
        inputTokens: event.totalUsage.inputTokens,
        outputTokens: event.totalUsage.outputTokens,
      }),
    onAbort: () => finish({ steps: 0, finishReason: "aborted", inputTokens: undefined, outputTokens: undefined }),
    onError: ({ error }) =>
      finish({
        steps: 0,
        finishReason: "error",
        inputTokens: undefined,
        outputTokens: undefined,
        error: error instanceof Error ? error.message : String(error),
      }),
  });

  return result
    .toUIMessageStream({ sendReasoning: false, onError: () => STREAM_ERROR_TEXT })
    .pipeThrough(redactStream({ hideSql: !showSql }));
}
