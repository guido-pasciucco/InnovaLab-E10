import { describe, expect, it } from "vitest";

import { KNOWLEDGE_EMBEDDING_DIMENSIONS } from "@/lib/db/knowledge/table";
import { AppError } from "@/lib/errors/app-error";

import {
  createBedrockEmbedder,
  DEFAULT_EMBEDDING_MODEL,
  MAX_PARALLEL_EMBEDDING_CALLS,
} from "./knowledge-embeddings";

const VECTOR = Array.from({ length: KNOWLEDGE_EMBEDDING_DIMENSIONS }, () => 0.01);

describe("createBedrockEmbedder", () => {
  it("throws KNOWLEDGE_UNAVAILABLE when the credentials are missing", () => {
    expect(() => createBedrockEmbedder({})).toThrow(AppError);
    expect(() => createBedrockEmbedder({})).toThrow(
      expect.objectContaining({ code: "KNOWLEDGE_UNAVAILABLE" }),
    );
  });

  it("sends the question to Titan and returns a 1024 dimension vector", async () => {
    const requests: { url: string; body: unknown }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ embedding: VECTOR, inputTextTokenCount: 3 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const embed = createBedrockEmbedder(
      {
        CHAT_DATOS_AWS_ACCESS_KEY_ID: "AKIA_TEST_KEY_000000",
        CHAT_DATOS_AWS_SECRET_ACCESS_KEY: "test-secret-value",
      },
      fetchImpl,
    );

    const [embedding] = await embed(["¿cómo se calcula el equilibrio?"]);

    expect(embedding).toHaveLength(KNOWLEDGE_EMBEDDING_DIMENSIONS);
    expect(requests).toHaveLength(1);
    expect(decodeURIComponent(requests[0].url)).toContain(DEFAULT_EMBEDDING_MODEL);
    expect(requests[0].url).toContain("us-east-1");
    expect(requests[0].body).toMatchObject({
      inputText: "¿cómo se calcula el equilibrio?",
      dimensions: KNOWLEDGE_EMBEDDING_DIMENSIONS,
      normalize: true,
    });
  });

  it("never has more than the allowed requests in flight at once", async () => {
    let inFlight = 0;
    let peak = 0;
    const fetchImpl: typeof fetch = async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return new Response(JSON.stringify({ embedding: VECTOR, inputTextTokenCount: 3 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const embed = createBedrockEmbedder(
      {
        CHAT_DATOS_AWS_ACCESS_KEY_ID: "AKIA_TEST_KEY_000000",
        CHAT_DATOS_AWS_SECRET_ACCESS_KEY: "test-secret-value",
      },
      fetchImpl,
    );

    const embeddings = await embed(Array.from({ length: 20 }, (_, index) => `texto ${index}`));

    expect(embeddings).toHaveLength(20);
    expect(peak).toBeLessThanOrEqual(MAX_PARALLEL_EMBEDDING_CALLS);
  });
});
