import { describe, expect, it, vi } from "vitest";
import type { HelpModel } from "@/lib/help/types";
import { streamHelpReply } from "./help";

const corpus = "Margen: parte del precio de venta que no es costo.";

function fakeModel(): HelpModel & { system: string | null } {
  const model = {
    system: null as string | null,
    stream(input: {
      system: string;
      messages: { role: "user" | "assistant"; content: string }[];
      abortSignal?: AbortSignal;
      maxOutputTokens: number;
    }) {
      model.system = input.system;
      expect(input.messages.at(-1)?.content).toBe("¿Qué es el margen?");
      expect(input.maxOutputTokens).toBe(500);
      return {
        textStream: (async function* () {
          yield "Es la parte del precio que no es costo.";
        })(),
        usage: Promise.resolve({ inputTokens: 10, outputTokens: 8 }),
        toTextStreamResponse: () => new Response("Es la parte del precio que no es costo."),
      };
    },
  };
  return model;
}

describe("streamHelpReply", () => {
  it("sends the product text and does not invent a calculation", async () => {
    const model = fakeModel();
    const stream = streamHelpReply(
      { messages: [{ role: "user", content: "¿Qué es el margen?" }] },
      model,
      corpus,
    );

    const chunks: string[] = [];
    for await (const chunk of stream.textStream) chunks.push(chunk);

    expect(chunks.join("")).toBe("Es la parte del precio que no es costo.");
    expect(model.system).toContain(corpus);
    expect(model.system).toContain("No pidas ni uses los números del cálculo");
    expect(model.system).not.toContain("alquiler");
  });

  it("rejects a thread that is too long before calling the model", () => {
    const stream = vi.fn();
    const model: HelpModel = { stream };
    const messages = Array.from({ length: 7 }, () => ({
      role: "user" as const,
      content: "¿Qué es el margen?",
    }));

    expect(() => streamHelpReply({ messages }, model, corpus)).toThrow();
    expect(stream).not.toHaveBeenCalled();
  });
});
