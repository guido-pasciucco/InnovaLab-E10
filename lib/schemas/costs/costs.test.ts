import { describe, expect, it } from "vitest";
import { z } from "zod";
import { costLineSchema } from "./costs";

const validLine = {
  concept: "alquiler del taller",
  amount: "150000",
  behavior: "fixed",
  traceability: "direct",
  isOwnLabor: false,
};

// Messages are defined once in the schema and shown on both sides:
// by RHF in the client and by the service's ZodError on the server.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("cost schemas", () => {
  it("accepts a valid line and keeps its amount as a string", () => {
    const result = costLineSchema.safeParse(validLine);

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toEqual(validLine);
  });

  it("accepts every combination of the independent dimensions", () => {
    for (const behavior of ["fixed", "variable"] as const) {
      for (const traceability of ["direct", "indirect"] as const) {
        for (const isOwnLabor of [true, false]) {
          const result = costLineSchema.safeParse({
            ...validLine,
            behavior,
            traceability,
            isOwnLabor,
          });

          expect(result.success).toBe(true);
        }
      }
    }
  });

  it.each(["", "   "])(
    "reports only the required message for an empty or whitespace-only amount",
    (amount) => {
      expect(fieldErrors(costLineSchema, { ...validLine, amount })).toEqual({
        amount: ["El importe es obligatorio."],
      });
    },
  );

  it("reports only the negative message for a negative amount", () => {
    expect(fieldErrors(costLineSchema, { ...validLine, amount: "-1" })).toEqual({
      amount: ["El importe no puede ser negativo."],
    });
  });

  it("reports only the numeric message for an amount with text", () => {
    expect(fieldErrors(costLineSchema, { ...validLine, amount: "texto" })).toEqual({
      amount: ["El importe debe ser un número."],
    });
  });

  it("reports the decimals message above two decimals and accepts two", () => {
    expect(fieldErrors(costLineSchema, { ...validLine, amount: "10.123" })).toEqual({
      amount: ["El importe debe tener hasta 2 decimales."],
    });

    expect(costLineSchema.safeParse({ ...validLine, amount: "10.12" }).success).toBe(true);
  });

  it("reports the concept message for an empty concept", () => {
    expect(fieldErrors(costLineSchema, { ...validLine, concept: "" })).toEqual({
      concept: ["Escribí el concepto del costo."],
    });
  });

  it("rejects values outside the enums", () => {
    const behaviorErrors = fieldErrors(costLineSchema, { ...validLine, behavior: "own_labor" });
    expect(behaviorErrors).toHaveProperty("behavior");

    const traceabilityErrors = fieldErrors(costLineSchema, {
      ...validLine,
      traceability: "trabajo-propio",
    });
    expect(traceabilityErrors).toHaveProperty("traceability");
  });
});
