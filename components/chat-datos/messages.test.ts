import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import { CHAT_DATOS_MAX_HISTORY_MESSAGE_CHARS } from "@/lib/chat-datos/request";
import { RUN_SQL_TOOL, SEARCH_DOCUMENTS_TOOL } from "@/lib/chat-datos/tools";

import {
  GENERIC_ERROR_TEXT,
  RUN_SQL_PART,
  SEARCH_DOCUMENTS_PART,
  buildChatRequestBody,
  buildHistory,
  describeChatError,
  messageText,
  toAnswerView,
} from "./messages";

type Part = UIMessage["parts"][number];
const part = (value: object) => value as Part;

let counter = 0;
function message(role: "user" | "assistant", ...parts: Part[]): UIMessage {
  counter += 1;
  return { id: `m${counter}`, role, parts };
}
const user = (text: string) => message("user", { type: "text", text });
const assistant = (text: string) => message("assistant", { type: "text", text });

const SQL_OUTPUT = {
  ok: true,
  sql: "select 1",
  columns: ["name", "margin"],
  rows: [{ name: "Torta", margin: "12.50" }],
  truncated: false,
  durationMs: 4,
};

function sqlPart(output: unknown, state = "output-available"): Part {
  return part({ type: RUN_SQL_PART, toolCallId: "c1", state, input: {}, output });
}

describe("tool part names", () => {
  it("match the tools the server registers", () => {
    expect(RUN_SQL_PART).toBe(`tool-${RUN_SQL_TOOL}`);
    expect(SEARCH_DOCUMENTS_PART).toBe(`tool-${SEARCH_DOCUMENTS_TOOL}`);
  });
});

describe("messageText", () => {
  it("joins the text parts and ignores everything else", () => {
    const msg = message(
      "assistant",
      { type: "text", text: "Primero." },
      sqlPart(SQL_OUTPUT),
      { type: "text", text: "  Después.  " },
      { type: "text", text: "   " },
    );

    expect(messageText(msg)).toBe("Primero.\n\nDespués.");
  });
});

describe("toAnswerView", () => {
  it("collects the text, the queries that ran and the sources without repeats", () => {
    const sources = {
      ok: true,
      sources: [
        { source: "docs/a.md", heading: "Punto de equilibrio", content: "x" },
        { source: "docs/a.md", heading: "Punto de equilibrio", content: "y" },
        { source: "docs/b.md", heading: "Margen", content: "z" },
      ],
    };
    const msg = message(
      "assistant",
      part({ type: SEARCH_DOCUMENTS_PART, toolCallId: "s1", state: "output-available", input: {}, output: sources }),
      sqlPart(SQL_OUTPUT),
      { type: "text", text: "Tu margen es 12,50." },
    );

    const view = toAnswerView(msg);

    expect(view.text).toBe("Tu margen es 12,50.");
    expect(view.sources).toEqual([
      { source: "docs/a.md", heading: "Punto de equilibrio" },
      { source: "docs/b.md", heading: "Margen" },
    ]);
    expect(view.queries).toHaveLength(1);
    expect(view.queries[0]).toMatchObject({ sql: "select 1", columns: ["name", "margin"], truncated: false });
    expect(view.working).toBe(false);
  });

  it("has no sql when the server did not send it", () => {
    const { sql: _sql, ...withoutSql } = SQL_OUTPUT;
    void _sql;

    const view = toAnswerView(message("assistant", sqlPart(withoutSql)));

    expect(view.queries[0]).not.toHaveProperty("sql");
  });

  it("skips failed queries and tools that returned an error", () => {
    const view = toAnswerView(
      message(
        "assistant",
        sqlPart({ ok: false, error: "rejected", reason: "no" }),
        sqlPart(undefined, "output-error"),
      ),
    );

    expect(view.queries).toEqual([]);
  });

  it("is working while a tool call has not finished", () => {
    expect(toAnswerView(message("assistant", sqlPart(undefined, "input-streaming"))).working).toBe(true);
    expect(toAnswerView(message("assistant", sqlPart(undefined, "input-available"))).working).toBe(true);
  });

  it("keeps a valid chart and drops a malformed one", () => {
    const chart = {
      type: "bar",
      title: "Margen",
      format: "currency",
      x: "name",
      y: ["margin"],
      data: [{ name: "Torta", margin: 12.5 }],
    };

    const good = toAnswerView(message("assistant", sqlPart({ ...SQL_OUTPUT, chart })));
    const bad = toAnswerView(message("assistant", sqlPart({ ...SQL_OUTPUT, chart: { type: "pie", title: "x" } })));
    const noAxis = toAnswerView(message("assistant", sqlPart({ ...SQL_OUTPUT, chart: { ...chart, x: undefined } })));

    expect(good.queries[0].chart).toMatchObject({ type: "bar", title: "Margen", y: ["margin"] });
    expect(bad.queries[0].chart).toBeUndefined();
    expect(noAxis.queries[0].chart).toBeUndefined();
    // The rows still show even when the chart is dropped.
    expect(bad.queries[0].rows).toHaveLength(1);
  });

  it("reads a table chart", () => {
    const chart = { type: "table", title: "Insumos", format: "number", columns: ["name"], data: [{ name: "Harina" }] };

    const view = toAnswerView(message("assistant", sqlPart({ ...SQL_OUTPUT, chart })));

    expect(view.queries[0].chart).toMatchObject({ type: "table", columns: ["name"] });
  });
});

describe("buildHistory", () => {
  it("returns whole question and answer pairs, oldest first", () => {
    const history = buildHistory([user("p1"), assistant("r1"), user("p2"), assistant("r2")]);

    expect(history).toEqual([
      { role: "user", content: "p1" },
      { role: "assistant", content: "r1" },
      { role: "user", content: "p2" },
      { role: "assistant", content: "r2" },
    ]);
  });

  it("leaves out a question whose answer never came", () => {
    const history = buildHistory([user("p1"), assistant("r1"), user("rota"), user("p3"), assistant("r3")]);

    expect(history.map((entry) => entry.content)).toEqual(["p1", "r1", "p3", "r3"]);
  });

  it("leaves out a pair whose answer has no text", () => {
    const onlyTool = message("assistant", sqlPart(SQL_OUTPUT));

    expect(buildHistory([user("p1"), onlyTool, user("p2"), assistant("r2")]).map((entry) => entry.content)).toEqual([
      "p2",
      "r2",
    ]);
  });

  it("never sends tool results, only the text", () => {
    const answer = message("assistant", sqlPart(SQL_OUTPUT), { type: "text", text: "Listo." });

    const history = buildHistory([user("p1"), answer]);

    expect(JSON.stringify(history)).not.toContain("select 1");
    expect(history[1]).toEqual({ role: "assistant", content: "Listo." });
  });

  it("keeps only the most recent five pairs", () => {
    const messages = Array.from({ length: 7 }, (_, index) => [user(`p${index}`), assistant(`r${index}`)]).flat();

    const history = buildHistory(messages);

    expect(history).toHaveLength(10);
    expect(history[0].content).toBe("p2");
    expect(history[9].content).toBe("r6");
  });

  it("cuts a message that is longer than the server accepts", () => {
    const long = "a".repeat(CHAT_DATOS_MAX_HISTORY_MESSAGE_CHARS + 500);

    const history = buildHistory([user("p"), assistant(long)]);

    expect(history[1].content).toHaveLength(CHAT_DATOS_MAX_HISTORY_MESSAGE_CHARS);
  });

  it("is empty with nothing to pair", () => {
    expect(buildHistory([])).toEqual([]);
    expect(buildHistory([user("sola")])).toEqual([]);
  });
});

describe("buildChatRequestBody", () => {
  it("sends the last message as the question and the earlier pairs as history", () => {
    const body = buildChatRequestBody([user("p1"), assistant("r1"), user("p2")]);

    expect(body).toEqual({
      question: "p2",
      history: [
        { role: "user", content: "p1" },
        { role: "assistant", content: "r1" },
      ],
    });
  });

  it("has an empty history on the first question and carries nothing else", () => {
    const body = buildChatRequestBody([user("hola")]);

    expect(body).toEqual({ question: "hola", history: [] });
    expect(Object.keys(body).sort()).toEqual(["history", "question"]);
  });
});

describe("describeChatError", () => {
  it("is null without an error", () => {
    expect(describeChatError(undefined)).toBeNull();
  });

  it("uses the message of the server's error envelope", () => {
    const body = JSON.stringify({ error: { code: "CHAT_DATOS_DISABLED", message: "Esta función no está disponible." } });

    expect(describeChatError(new Error(body))).toBe("Esta función no está disponible.");
  });

  it("never shows the raw text of an unknown error", () => {
    expect(describeChatError(new Error("TypeError: failed to fetch https://internal/host"))).toBe(GENERIC_ERROR_TEXT);
    expect(describeChatError(new Error(JSON.stringify({ other: 1 })))).toBe(GENERIC_ERROR_TEXT);
    expect(describeChatError(new Error("null"))).toBe(GENERIC_ERROR_TEXT);
  });
});
