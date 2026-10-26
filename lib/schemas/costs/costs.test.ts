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

// Messages are defined once in the schema and shown on both sides: by RHF in
// the client and by the service's ZodError on the server.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("costLineSchema", () => {
  it("keeps a valid line and preserves its amount as a string", () => {
    const result = costLineSchema.safeParse(validLine);

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toEqual(validLine);
  });

  it.each([
    { behavior: "fixed", traceability: "direct", isOwnLabor: false },
    { behavior: "fixed", traceability: "direct", isOwnLabor: true },
    { behavior: "fixed", traceability: "indirect", isOwnLabor: false },
    { behavior: "fixed", traceability: "indirect", isOwnLabor: true },
    { behavior: "variable", traceability: "direct", isOwnLabor: false },
    { behavior: "variable", traceability: "direct", isOwnLabor: true },
    { behavior: "variable", traceability: "indirect", isOwnLabor: false },
    { behavior: "variable", traceability: "indirect", isOwnLabor: true },
  ])(
    "accepts the combination behavior=$behavior traceability=$traceability isOwnLabor=$isOwnLabor",
    ({ behavior, traceability, isOwnLabor }) => {
      const result = costLineSchema.safeParse({
        ...validLine,
        behavior,
        traceability,
        isOwnLabor,
      });

      expect(result.success).toBe(true);
    },
  );

  it.each(["", "   "])(

    "reports the required message when the amount is %j",
    (amount) => {
      expect(fieldErrors(costLineSchema, { ...validLine, amount })).toEqual({
        amount: ["El importe es obligatorio."],
      });
    },
  );

  it("reports the numeric message when the amount has text", () => {
    expect(fieldErrors(costLineSchema, { ...validLine, amount: "texto" })).toEqual({
      amount: ["El importe debe ser un número."],
    });
  });

  it("reports the numeric message when the amount is not a string", () => {
    expect(fieldErrors(costLineSchema, { ...validLine, amount: 42 })).toEqual({
      amount: ["El importe debe ser un número."],
    });
  });

  it("reports the negative message when the amount is negative", () => {
    expect(fieldErrors(costLineSchema, { ...validLine, amount: "-1" })).toEqual({
      amount: ["El importe no puede ser negativo."],
    });
  });

  it("reports the decimals message when the amount has more than two decimals", () => {
    expect(fieldErrors(costLineSchema, { ...validLine, amount: "10.123" })).toEqual({
      amount: ["El importe debe tener hasta 2 decimales."],
    });
  });

  it("accepts an amount with exactly two decimals", () => {
    expect(costLineSchema.safeParse({ ...validLine, amount: "10.12" }).success).toBe(true);
  });

  it("reports the size message when the amount exceeds the column limit", () => {
    // numeric(12,2) fits 10 integer digits (BUG-004).
    expect(fieldErrors(costLineSchema, { ...validLine, amount: "99999999999.99" })).toEqual({
      amount: ["El importe es demasiado grande."],
    });
  });

  it("accepts an amount at the column limit", () => {
    expect(costLineSchema.safeParse({ ...validLine, amount: "9999999999.99" }).success).toBe(true);
  });

  it("reports the concept message when the concept is empty", () => {
    expect(fieldErrors(costLineSchema, { ...validLine, concept: "" })).toEqual({
      concept: ["Escribí el concepto del costo."],
    });
  });

  it("reports the concept message when the concept is not a string", () => {
    expect(fieldErrors(costLineSchema, { ...validLine, concept: 42 })).toEqual({
      concept: ["Escribí el concepto del costo."],
    });
  });

  it("reports the concept message when the concept is too long", () => {
    expect(fieldErrors(costLineSchema, { ...validLine, concept: "a".repeat(201) })).toEqual({
      concept: ["El concepto del costo debe tener como máximo 200 caracteres."],
    });
  });

  it("reports the behavior message when the value is not in the enum", () => {
    expect(fieldErrors(costLineSchema, { ...validLine, behavior: "own_labor" })).toEqual({
      behavior: ["Elegí cómo se comporta el costo: fijo o variable."],
    });
  });

  it("reports the traceability message when the value is not in the enum", () => {
    expect(
      fieldErrors(costLineSchema, { ...validLine, traceability: "trabajo-propio" }),
    ).toEqual({
      traceability: [
        "Elegí cómo se relaciona el costo con el producto: directo o indirecto.",
      ],
    });
  });
});
