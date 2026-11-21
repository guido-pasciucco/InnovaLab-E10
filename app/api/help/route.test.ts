import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import type { HelpModel } from "@/lib/help/types";

const getSessionUserService = vi.fn();
const acquireHelpLeaseService = vi.fn();
const readHelpConfig = vi.fn();
const readHelpCorpus = vi.fn();
const createBedrockHelpModel = vi.fn();

vi.mock("@/lib/supabase/rsc", () => ({ createRscSupabaseClient: async () => ({ tag: "rsc-client" }) }));
vi.mock("@/lib/services/auth", () => ({
  getSessionUserService: (...args: unknown[]) => getSessionUserService(...args),
}));
vi.mock("@/lib/services/help-consumption", () => ({
  acquireHelpLeaseService: (...args: unknown[]) => acquireHelpLeaseService(...args),
  HELP_REQUEST_TIMEOUT_MS: 20_000,
}));
vi.mock("@/lib/help/config", () => ({ readHelpConfig: () => readHelpConfig() }));
vi.mock("@/lib/help/corpus", () => ({ readHelpCorpus: () => readHelpCorpus() }));
vi.mock("@/lib/help/bedrock", () => ({ createBedrockHelpModel: () => createBedrockHelpModel() }));

const { POST } = await import("./route");

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/help", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validThread = { messages: [{ role: "user", content: "¿Qué es el margen?" }] };
const sessionUser = { id: "00000000-0000-4000-8000-0000000000aa", email: "ana@example.test" };

type StreamInput = { abortSignal?: AbortSignal };

function fakeModel(
  textStream: AsyncIterable<string>,
  onStream?: (input: StreamInput) => void,
): HelpModel {
  return {
    stream: (input) => {
      onStream?.(input);
      return {
        textStream,
        usage: Promise.resolve({ inputTokens: 3, outputTokens: 2 }),
        toTextStreamResponse: () => new Response(""),
      };
    },
  };
}

// First chunk is delivered, then the model hangs until the route's composed
// abort signal fires (client disconnect, logout or timeout), failing the way
// Bedrock does when the request is cancelled.
function hangingAfterFirstChunk(onStream: (input: StreamInput) => void): HelpModel {
  let captured: StreamInput = {};
  const textStream = (async function* () {
    yield "Empieza ";
    if (!captured.abortSignal) throw new Error("route must pass an abort signal");
    await new Promise<never>((_, reject) => {
      captured.abortSignal!.addEventListener(
        "abort",
        () => reject(new Error("BedrockRequestAborted")),
        { once: true },
      );
    });
  })();
  return fakeModel(textStream, (input) => {
    captured = input;
    onStream(input);
  });
}

async function* yielding(...chunks: string[]) {
  for (const chunk of chunks) yield chunk;
}

async function* failingProvider() {
  throw new Error("BedrockInternalError secret=AKIA-LEAK");
}

describe("POST /api/help", () => {
  beforeEach(() => {
    readHelpConfig.mockReturnValue({
      provider: "bedrock",
      region: "us-east-1",
      modelId: "arn:aws:bedrock:us-east-1:123456789012:application-inference-profile/abc",
      accessKeyId: "key",
      secretAccessKey: "secret",
    });
    readHelpCorpus.mockReturnValue("Margen: parte del precio de venta que no es costo.");
    createBedrockHelpModel.mockReturnValue(fakeModel(yielding("Es la parte ", "del precio.")));
    getSessionUserService.mockResolvedValue(sessionUser);
    acquireHelpLeaseService.mockResolvedValue({ id: "lease-1", release: vi.fn() });
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 without acquiring a lease when the session is missing", async () => {
    getSessionUserService.mockRejectedValue(new AppError("UNAUTHORIZED"));

    const response = await POST(post(validThread));

    expect(response.status).toBe(401);
    expect(acquireHelpLeaseService).not.toHaveBeenCalled();
  });

  it("streams the reply with the lease of the session user and releases it at the end", async () => {
    const release = vi.fn();
    acquireHelpLeaseService.mockResolvedValue({ id: "lease-1", release });

    const response = await POST(post(validThread));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Es la parte del precio.");
    expect(acquireHelpLeaseService).toHaveBeenCalledWith(sessionUser.id);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("releases the lease when the thread fails validation", async () => {
    const release = vi.fn();
    acquireHelpLeaseService.mockResolvedValue({ id: "lease-1", release });
    const tooLong = {
      messages: Array.from({ length: 7 }, () => ({ role: "user", content: "¿Qué es el margen?" })),
    };

    const response = await POST(post(tooLong));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION" } });
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("releases the lease and hides provider details when the provider fails", async () => {
    const release = vi.fn();
    acquireHelpLeaseService.mockResolvedValue({ id: "lease-1", release });
    createBedrockHelpModel.mockReturnValue(fakeModel(failingProvider()));

    const response = await POST(post(validThread));

    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(response.status).toBe(503);
    expect(body.error.code).toBe("HELP_UNAVAILABLE");
    expect(body.error.message).not.toContain("AKIA-LEAK");
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("releases the lease and ends the stream when the client aborts mid-stream", async () => {
    const release = vi.fn();
    acquireHelpLeaseService.mockResolvedValue({ id: "lease-1", release });
    createBedrockHelpModel.mockReturnValue(hangingAfterFirstChunk(() => {}));
    const abort = new AbortController();

    const response = await POST(
      new NextRequest("http://localhost:3000/api/help", {
        method: "POST",
        body: JSON.stringify(validThread),
        signal: abort.signal,
      }),
    );

    expect(response.status).toBe(200);
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("Empieza ");

    abort.abort();

    await expect(reader.read()).rejects.toThrow("Help stream unavailable");
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("returns 429 when the shared rate limit rejects the request", async () => {
    acquireHelpLeaseService.mockRejectedValue(new AppError("HELP_RATE_LIMITED"));

    const response = await POST(post(validThread));

    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: { code: "HELP_RATE_LIMITED" } });
  });

  it("returns 409 when another request holds the lease", async () => {
    acquireHelpLeaseService.mockRejectedValue(new AppError("HELP_BUSY"));

    const response = await POST(post(validThread));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "HELP_BUSY" } });
  });
});
