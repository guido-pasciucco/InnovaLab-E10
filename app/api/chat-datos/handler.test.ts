import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import type { SupabaseClient } from "@supabase/supabase-js";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";

import type { ChatDatosConfig } from "@/lib/chat-datos/config";
import { AppError } from "@/lib/errors/app-error";
import { getSessionUserService } from "@/lib/services/auth";

import { createChatDatosHandler, type ChatDatosHandlerDeps } from "./handler";

// The door, end to end, with a scripted model: no AWS, database or cookies.

const SQL = "select name from products";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

const answer = (text: string): LanguageModelV4StreamPart[] => [
  { type: "stream-start", warnings: [] },
  { type: "text-start", id: "t1" },
  { type: "text-delta", id: "t1", delta: text },
  { type: "text-end", id: "t1" },
  { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
];

const sqlCall: LanguageModelV4StreamPart[] = [
  { type: "stream-start", warnings: [] },
  { type: "tool-call", toolCallId: "c1", toolName: "run_sql", input: JSON.stringify({ sql: SQL }) },
  { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
];

const step = (chunks: LanguageModelV4StreamPart[]) => ({ stream: simulateReadableStream({ chunks }) });

// The session user comes out of the real service, with a fake Supabase client.
async function sessionUser(id = "user-a") {
  const client = {
    auth: { getUser: async () => ({ data: { user: { id, email: `${id}@test.dev` } }, error: null }) },
  } as unknown as SupabaseClient;
  return getSessionUserService(client);
}

const ENABLED: ChatDatosConfig = { enabled: true, showSql: false, modelId: "test-model" };

async function setup(overrides: Partial<ChatDatosHandlerDeps> = {}, scripted?: MockLanguageModelV4) {
  const user = await sessionUser();
  const model =
    scripted ?? new MockLanguageModelV4({ doStream: [step(sqlCall), step(answer("Tenés 2 productos."))] });
  const runSql = vi.fn(async () => ({
    sql: SQL,
    columns: ["name"],
    rows: [{ name: "Alfajor" }, { name: "Torta" }],
    truncated: false,
    durationMs: 3,
  }));
  const deps = {
    readConfig: vi.fn(() => ENABLED),
    getUser: vi.fn(async () => user),
    createModel: vi.fn(() => model),
    createToolDeps: vi.fn(() => ({ runSql, searchDocuments: vi.fn(async () => []) })),
    loadSchema: vi.fn(async () => "Vista products: Productos.\n  - name (text)"),
    today: vi.fn(() => "2026-11-23"),
    log: vi.fn(),
    ...overrides,
  } satisfies ChatDatosHandlerDeps;

  return { handler: createChatDatosHandler(deps), deps, model, user, runSql };
}

const post = (body: unknown) =>
  new Request("http://localhost/api/chat-datos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /api/chat-datos: gates", () => {
  it("answers as if it did not exist while the feature is off, without touching the session", async () => {
    const { handler, deps } = await setup({ readConfig: vi.fn(() => ({ ...ENABLED, enabled: false })) });

    const response = await handler(post({ question: "hola" }));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "CHAT_DATOS_DISABLED" } });
    expect(deps.getUser).not.toHaveBeenCalled();
    expect(deps.createModel).not.toHaveBeenCalled();
  });

  it("rejects a request without session before reading the body or calling the model", async () => {
    const { handler, deps } = await setup({ getUser: vi.fn(async () => null) });

    const response = await handler(post({ question: "hola" }));

    expect(response.status).toBe(401);
    expect(deps.createModel).not.toHaveBeenCalled();
    expect(deps.loadSchema).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    const { handler, deps } = await setup();

    const response = await handler(post("{no es json"));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION" } });
    expect(deps.createModel).not.toHaveBeenCalled();
  });

  it("rejects an empty question and says which field is wrong", async () => {
    const { handler, deps } = await setup();

    const response = await handler(post({ question: "   " }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.details.fieldErrors.question).toEqual(["Escribí una pregunta."]);
    expect(deps.createModel).not.toHaveBeenCalled();
  });

  it("rejects a history that does not alternate", async () => {
    const { handler } = await setup();
    const history = [
      { role: "user", content: "a" },
      { role: "user", content: "b" },
    ];

    expect((await handler(post({ question: "hola", history }))).status).toBe(400);
  });

  it("answers 503 when the AWS credentials are missing, without leaking details", async () => {
    const { handler } = await setup({
      createModel: vi.fn(() => {
        throw new AppError("CHAT_DATOS_UNAVAILABLE");
      }),
    });

    const response = await handler(post({ question: "hola" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "CHAT_DATOS_UNAVAILABLE" } });
  });

  it("answers 503, not 500, when something unexpected fails before the stream starts", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { handler } = await setup({ loadSchema: vi.fn().mockRejectedValue(new Error("db password=hunter2")) });

    const response = await handler(post({ question: "hola" }));

    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("hunter2");
  });
});

describe("POST /api/chat-datos: the answer", () => {
  it("streams the answer with the right headers", async () => {
    const { handler } = await setup();

    const response = await handler(post({ question: "¿cuántos productos tengo?" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const body = await response.text();
    expect(body).toContain("Tenés 2 productos.");
    expect(body).toContain('"type":"tool-output-available"');
  });

  it("builds the tools for the session user, never for an id in the body", async () => {
    const { handler, deps, user } = await setup();

    const response = await handler(
      post({ question: "hola", userId: "user-b", user: { id: "user-b" }, history: [] }),
    );
    await response.text();

    expect(deps.createToolDeps).toHaveBeenCalledTimes(1);
    expect(deps.createToolDeps).toHaveBeenCalledWith(user.id);
    expect(user.id).toBe("user-a");
  });

  it("gives the model the schema, today's date, the history and the question", async () => {
    const { handler, model } = await setup();

    const response = await handler(
      post({
        question: "¿y el mes pasado?",
        history: [
          { role: "user", content: "¿cuánto gasté?" },
          { role: "assistant", content: "Gastaste $ 1.200." },
        ],
      }),
    );
    await response.text();

    const prompt = JSON.stringify(model.doStreamCalls[0].prompt);
    expect(prompt).toContain("Vista products: Productos.");
    expect(prompt).toContain("2026-11-23");
    expect(prompt).toContain("¿cuánto gasté?");
    expect(prompt).toContain("¿y el mes pasado?");
  });

  it("hides the SQL from the browser unless CHAT_DATOS_SHOW_SQL is on", async () => {
    const hidden = await setup();
    const hiddenBody = await (await hidden.handler(post({ question: "hola" }))).text();
    expect(hiddenBody).not.toContain(SQL);

    const shown = await setup({ readConfig: vi.fn(() => ({ ...ENABLED, showSql: true })) });
    const shownBody = await (await shown.handler(post({ question: "hola" }))).text();
    expect(shownBody).toContain(SQL);
  });

  it("logs the question and the query once the answer ends", async () => {
    const { handler, deps } = await setup();

    await (await handler(post({ question: "¿cuántos productos tengo?" }))).text();

    await vi.waitFor(() => expect(deps.log).toHaveBeenCalledTimes(1));
    expect(deps.log).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "¿cuántos productos tengo?",
        queries: [expect.objectContaining({ sql: SQL, rows: 2 })],
      }),
    );
  });
});
