import type { LanguageModelV4 } from "@ai-sdk/provider";
import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors/app-error";

import { CHAT_DATOS_BEDROCK_REGION, createChatDatosModel } from "./model";

// Fake keys: nothing here reaches AWS. A fake fetch stands in for the network.
const ENV = {
  CHAT_DATOS_AWS_ACCESS_KEY_ID: "AKIA_TEST_KEY_000000",
  CHAT_DATOS_AWS_SECRET_ACCESS_KEY: "test-secret-value",
};

describe("createChatDatosModel", () => {
  it("throws CHAT_DATOS_UNAVAILABLE when the credentials are missing", () => {
    expect(() => createChatDatosModel("model-id", {})).toThrow(AppError);
    expect(() => createChatDatosModel("model-id", {})).toThrow(
      expect.objectContaining({ code: "CHAT_DATOS_UNAVAILABLE" }),
    );
  });

  it("treats blank credentials as missing", () => {
    expect(() =>
      createChatDatosModel("model-id", { ...ENV, CHAT_DATOS_AWS_SECRET_ACCESS_KEY: "   " }),
    ).toThrow(expect.objectContaining({ code: "CHAT_DATOS_UNAVAILABLE" }));
  });

  it("builds the model asked for, without calling AWS", () => {
    const model = createChatDatosModel("us.anthropic.test-model-v1:0", ENV) as LanguageModelV4;
    expect(model.modelId).toBe("us.anthropic.test-model-v1:0");
  });

  it("calls the Bedrock endpoint of us-east-1 with the agent's own keys", async () => {
    const requests: { url: string; authorization: string | null }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push({
        url: String(input),
        authorization: new Headers(init?.headers).get("authorization"),
      });
      return new Response(JSON.stringify({ message: "denied" }), { status: 403 });
    };
    const model = createChatDatosModel("anthropic.test-model-v1:0", ENV, fetchImpl) as LanguageModelV4;

    await expect(
      model.doStream({ prompt: [{ role: "user", content: [{ type: "text", text: "hola" }] }] }),
    ).rejects.toThrow();

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain(`bedrock-runtime.${CHAT_DATOS_BEDROCK_REGION}.amazonaws.com`);
    expect(requests[0].url).toContain("converse-stream");
    expect(requests[0].authorization).toContain("Credential=AKIA_TEST_KEY_000000/");
  });
});
