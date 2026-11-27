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

  it("keeps a conceptual question about the user's products in Mora", () => {
    const stream = vi.fn((input) => ({
      textStream: (async function* () {})(),
      usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
      toTextStreamResponse: () => new Response(""),
    }));
    const model: HelpModel = { stream };
    const question = "¿Cómo calculo el margen de mis productos?";

    streamHelpReply({ messages: [{ role: "user", content: question }] }, model, corpus);

    expect(stream).toHaveBeenCalledWith(expect.objectContaining({
      messages: [{ role: "user", content: question }],
      system: expect.stringContaining("respondela normalmente"),
    }));
  });

  it("instructs Mora to route private-data analysis conditionally without calling another agent", () => {
    const stream = vi.fn((input) => ({
      textStream: (async function* () {})(),
      usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
      toTextStreamResponse: () => new Response(""),
    }));
    const model: HelpModel = { stream };
    const question = "¿Cuál fue el margen real de mi negocio este mes?";

    streamHelpReply(
      { messages: [{ role: "user", content: question }] },
      model,
      corpus,
      undefined,
      { chatDatosEnabled: true },
    );

    expect(stream).toHaveBeenCalledWith(expect.objectContaining({
      messages: [{ role: "user", content: question }],
      system: expect.stringContaining("La función «Hablá con tus datos» está disponible"),
    }));
    expect(stream).toHaveBeenCalledTimes(1);
  });

  it("passes the six recent messages so follow-ups and corrections keep their context", () => {
    const stream = vi.fn((input) => ({
      textStream: (async function* () {})(),
      usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
      toTextStreamResponse: () => new Response(""),
    }));
    const model: HelpModel = { stream };
    const messages = [
      { role: "assistant" as const, content: "El margen compara precio y costo." },
      { role: "user" as const, content: "Explicamelo más fácil." },
      { role: "assistant" as const, content: "Es la plata que queda antes de otros gastos." },
      { role: "user" as const, content: "¿Y eso cómo se calcula?" },
      { role: "assistant" as const, content: "Se resta el costo al precio." },
      { role: "user" as const, content: "No, me refería al porcentaje." },
    ];

    streamHelpReply({ messages }, model, corpus);

    expect(stream).toHaveBeenCalledWith(expect.objectContaining({
      messages,
      system: expect.stringMatching(/Usá los mensajes recientes[\s\S]*No, me refería a/),
      maxOutputTokens: 500,
    }));
  });

  it.each([
    {
      caseName: "solicitud de respuesta breve",
      messages: [
        { role: "assistant" as const, content: "El margen compara precio y costo." },
        { role: "user" as const, content: "Resumilo." },
      ],
      instruction: "«resumilo» sintetiza la respuesta anterior",
    },
    {
      caseName: "simplificación de una explicación",
      messages: [
        { role: "assistant" as const, content: "La contribución cubre costos fijos." },
        { role: "user" as const, content: "Explicamelo más fácil." },
      ],
      instruction: "«más fácil» simplifica vocabulario y pasos",
    },
    {
      caseName: "reformulación después de una confusión",
      messages: [
        { role: "assistant" as const, content: "El recargo se calcula sobre el costo." },
        { role: "user" as const, content: "No entendí, decímelo de otra forma." },
      ],
      instruction: "«no entendí» reformula desde otro enfoque sin repetir el mismo texto",
    },
    {
      caseName: "solicitud de otro ejemplo",
      messages: [
        { role: "assistant" as const, content: "Una torta puede ilustrar el costo unitario." },
        { role: "user" as const, content: "Dame otro ejemplo." },
      ],
      instruction: "«otro ejemplo»",
    },
    {
      caseName: "adaptación al rubro del emprendimiento",
      messages: [{ role: "user" as const, content: "Dame un ejemplo para mi emprendimiento de cosmética." }],
      instruction: "repostería, artesanías, indumentaria, cosmética",
    },
    {
      caseName: "referencia al mensaje anterior",
      messages: [
        { role: "assistant" as const, content: "El margen se expresa en pesos o porcentaje." },
        { role: "user" as const, content: "¿Y eso cómo se calcula?" },
      ],
      instruction: "Usá los mensajes recientes",
    },
    {
      caseName: "corrección explícita de interpretación",
      messages: [
        { role: "assistant" as const, content: "Te explico el recargo." },
        { role: "user" as const, content: "No, me refería al margen." },
      ],
      instruction: "sin insistir en la lectura anterior",
    },
    {
      caseName: "lenguaje informal y error ortográfico",
      messages: [{ role: "user" as const, content: "q es el marjen y cuánta plata me queda" }],
      instruction: "expresiones informales, abreviaciones o errores habituales",
    },
    {
      caseName: "precisión entre conceptos financieros",
      messages: [{ role: "user" as const, content: "¿Margen, recargo y ganancia neta son lo mismo?" }],
      instruction: "no confundas margen, recargo, contribución, utilidad ni ganancia neta",
    },
    {
      caseName: "pregunta ambigua que requiere aclaración",
      messages: [{ role: "user" as const, content: "¿Cuánto me queda?" }],
      instruction: "una sola pregunta aclaratoria breve",
    },
  ])("passes the $caseName and its handling instruction to the model", ({ messages, instruction }) => {
    const stream = vi.fn((input) => ({
      textStream: (async function* () {})(),
      usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
      toTextStreamResponse: () => new Response(""),
    }));
    const model: HelpModel = { stream };

    streamHelpReply({ messages }, model, corpus);

    expect(stream).toHaveBeenCalledWith(expect.objectContaining({
      messages,
      system: expect.stringContaining(instruction),
      maxOutputTokens: 500,
    }));
    expect(stream).toHaveBeenCalledTimes(1);
  });
});
