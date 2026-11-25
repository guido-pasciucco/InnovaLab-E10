import type { UIMessage } from "ai";

import type { ChartRow, ResolvedChart } from "@/lib/chat-datos/chart-spec";
import {
  CHAT_DATOS_MAX_HISTORY_MESSAGES,
  CHAT_DATOS_MAX_HISTORY_MESSAGE_CHARS,
  type ChatHistoryMessage,
} from "@/lib/chat-datos/request";

// Pure functions between the stream the server sends and what the chat shows.
// No React here, so the rules (what counts as history, what a failure says)
// are tested without a browser.

// The stream names a tool part "tool-<tool name>". The names are written here
// and not imported from lib/chat-datos/tools.ts, which pulls server code into
// the browser bundle; messages.test.ts checks they still match.
export const RUN_SQL_PART = "tool-run_sql";
export const SEARCH_DOCUMENTS_PART = "tool-search_documents";

// Same text the server sends when a stream breaks (STREAM_ERROR_TEXT in
// lib/chat-datos/agent.ts), used for any failure the browser cannot explain.
export const GENERIC_ERROR_TEXT = "No pude completar la respuesta. Probá de nuevo en unos minutos.";
export const EMPTY_ANSWER_TEXT = "No pude armar una respuesta con eso. Probá reformular la pregunta.";

export type QueryView = {
  // Only when the server sends it (CHAT_DATOS_SHOW_SQL).
  sql?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
  chart?: ResolvedChart;
};

export type SourceView = { source: string; heading: string };

export type AnswerView = {
  text: string;
  sources: SourceView[];
  // Only queries that ran. A failed one shows nothing: the answer explains it.
  queries: QueryView[];
  // A tool call is still running.
  working: boolean;
};

type Part = UIMessage["parts"][number];

export function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<Part, { type: "text" }> => part.type === "text")
    .map((part) => part.text.trim())
    .filter((text) => text !== "")
    .join("\n\n");
}

export function toAnswerView(message: UIMessage): AnswerView {
  const sources: SourceView[] = [];
  const queries: QueryView[] = [];
  let working = false;

  for (const part of message.parts) {
    if (part.type !== RUN_SQL_PART && part.type !== SEARCH_DOCUMENTS_PART) continue;
    const tool = part as { state?: string; output?: unknown };

    if (tool.state !== "output-available") {
      working ||= tool.state === "input-streaming" || tool.state === "input-available";
      continue;
    }

    if (part.type === RUN_SQL_PART) {
      const query = readQuery(tool.output);
      if (query) queries.push(query);
    } else {
      for (const source of readSources(tool.output)) {
        if (!sources.some((known) => known.source === source.source && known.heading === source.heading)) {
          sources.push(source);
        }
      }
    }
  }

  return { text: messageText(message), sources, queries, working };
}

// Whole question and answer pairs, oldest first. A question whose answer never
// came (the stream broke) is left out, so the server always gets turns that
// alternate. Only the text travels: tool results never go back to the server.
export function buildHistory(messages: readonly UIMessage[]): ChatHistoryMessage[] {
  const pairs: ChatHistoryMessage[][] = [];

  for (let index = 0; index < messages.length - 1; index += 1) {
    const question = messages[index];
    const answer = messages[index + 1];
    if (question.role !== "user" || answer.role !== "assistant") continue;

    const questionText = messageText(question);
    const answerText = messageText(answer);
    index += 1;
    if (questionText === "" || answerText === "") continue;

    pairs.push([
      { role: "user", content: clip(questionText) },
      { role: "assistant", content: clip(answerText) },
    ]);
  }

  return pairs.slice(-(CHAT_DATOS_MAX_HISTORY_MESSAGES / 2)).flat();
}

// Body of POST /api/chat-datos: the new question is the last message, the
// rest is history. The signed-in user is never sent: the server takes it from
// the session.
export function buildChatRequestBody(messages: readonly UIMessage[]): { question: string; history: ChatHistoryMessage[] } {
  const last = messages[messages.length - 1];
  return {
    question: last ? messageText(last) : "",
    history: buildHistory(messages.slice(0, -1)),
  };
}

// The message of an error the chat shows. A refusal from the server arrives as
// the JSON of the error catalog; anything else gets the generic text, never
// the raw message of a network or stream error.
export function describeChatError(error: Error | undefined): string | null {
  if (!error) return null;
  try {
    const body: unknown = JSON.parse(error.message);
    const message = (body as { error?: { message?: unknown } } | null)?.error?.message;
    if (typeof message === "string" && message.trim() !== "") return message;
  } catch {
    // Not JSON: fall through.
  }
  return GENERIC_ERROR_TEXT;
}

function clip(text: string): string {
  return text.length > CHAT_DATOS_MAX_HISTORY_MESSAGE_CHARS ? text.slice(0, CHAT_DATOS_MAX_HISTORY_MESSAGE_CHARS) : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readQuery(output: unknown): QueryView | null {
  if (!isRecord(output) || output.ok !== true) return null;
  if (!Array.isArray(output.columns) || !Array.isArray(output.rows)) return null;

  const query: QueryView = {
    columns: output.columns.filter((column): column is string => typeof column === "string"),
    rows: output.rows.filter(isRecord),
    truncated: output.truncated === true,
  };
  if (typeof output.sql === "string") query.sql = output.sql;
  const chart = readChart(output.chart);
  if (chart) query.chart = chart;
  return query;
}

// The server already checked the chart, but this comes over the network: a
// malformed one is dropped instead of breaking the whole screen.
function readChart(value: unknown): ResolvedChart | null {
  if (!isRecord(value) || typeof value.title !== "string" || !Array.isArray(value.data)) return null;
  if (!["number", "currency", "percent"].includes(String(value.format))) return null;

  const base = { title: value.title, format: value.format as ResolvedChart["format"], data: value.data.filter(isRecord) as ChartRow[] };

  if (value.type === "table") {
    return Array.isArray(value.columns) ? { ...base, type: "table", columns: value.columns.map(String) } : null;
  }
  if (value.type === "bar" || value.type === "line" || value.type === "histogram") {
    return typeof value.x === "string" && Array.isArray(value.y)
      ? { ...base, type: value.type, x: value.x, y: value.y.map(String) }
      : null;
  }
  return null;
}

function readSources(output: unknown): SourceView[] {
  if (!isRecord(output) || output.ok !== true || !Array.isArray(output.sources)) return [];
  return output.sources.filter(isRecord).flatMap((source) =>
    typeof source.source === "string" && typeof source.heading === "string"
      ? [{ source: source.source, heading: source.heading }]
      : [],
  );
}
