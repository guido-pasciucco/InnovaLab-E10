import { describe, expect, it } from "vitest";
import { helpRequestSchema } from "./help";

const question = { role: "user" as const, content: "¿Qué es el margen?" };

describe("helpRequestSchema", () => {
  it("accepts a question and a short thread", () => {
    const parsed = helpRequestSchema.parse({
      messages: [
        question,
        { role: "assistant", content: "Es la parte del precio que no es costo." },
        { role: "user", content: "¿Y el punto de equilibrio?" },
      ],
    });
    expect(parsed.messages).toHaveLength(3);
  });

  it("rejects an empty question", () => {
    const result = helpRequestSchema.safeParse({
      messages: [{ role: "user", content: "   " }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a thread that does not end with a question", () => {
    const result = helpRequestSchema.safeParse({
      messages: [question, { role: "assistant", content: "Listo." }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than six messages", () => {
    const messages = Array.from({ length: 7 }, () => question);
    const result = helpRequestSchema.safeParse({ messages });
    expect(result.success).toBe(false);
  });

  it("rejects a thread whose combined content is too long", () => {
    const messages = Array.from({ length: 4 }, () => ({
      role: "user" as const,
      content: "a".repeat(1_600),
    }));

    const result = helpRequestSchema.safeParse({ messages });

    expect(result.success).toBe(false);
  });
});
