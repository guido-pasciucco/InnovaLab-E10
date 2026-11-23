import { describe, expect, it } from "vitest";
import { z } from "zod";

import { periodCostLineSchema } from "./period-costs";

const validLine = { concept: "Alquiler del taller", amountPeriod: "150000.00" };

function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("periodCostLineSchema", () => {
  it("keeps a valid line with the canonical amount", () => {
    const result = periodCostLineSchema.safeParse(validLine);

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toEqual(validLine);
  });

  it("converts the Argentine amount typed in the modal to a decimal string", () => {
    const result = periodCostLineSchema.safeParse({
      concept: "Servicios",
      amountPeriod: "25.000,50",
    });

    expect(result.success ? result.data : null).toEqual({
      concept: "Servicios",
      amountPeriod: "25000.50",
    });
  });

  it.each([
    { input: { ...validLine, concept: "   " }, field: "concept", message: "Escribí el concepto del costo." },
    { input: { ...validLine, amountPeriod: "" }, field: "amountPeriod", message: "El importe es obligatorio." },
    { input: { ...validLine, amountPeriod: "-1" }, field: "amountPeriod", message: "El importe no puede ser negativo." },
    { input: { ...validLine, amountPeriod: "10,123" }, field: "amountPeriod", message: "El importe debe tener hasta 2 decimales." },
  ])("reports $message when $field is invalid", ({ input, field, message }) => {
    expect(fieldErrors(periodCostLineSchema, input)).toEqual({
      [field]: [message],
    });
  });
});
