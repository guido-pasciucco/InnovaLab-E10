import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createBusinessCostLineInputSchema,
  createCalcCostLineInputSchema,
} from "./validation";

// DB tests cover shared-field wiring and removal of server-controlled fields
// (see TEST.md). The rules themselves live in lib/schemas/costs/fields.ts.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

const SERVER_ID = "6f1c2b7e-3d4a-4f5b-9c8d-1e2f3a4b5c6d";
const SERVER_TIMESTAMP = new Date("2026-01-01T00:00:00.000Z");

const validBusinessCostLine = {
  concept: "Alquiler del taller",
  behavior: "fixed",
  traceability: "indirect",
  amountPeriod: "150000.00",
};

const validCalcCostLine = {
  sourceBusinessCostId: SERVER_ID,
  concept: "Harina del pan",
  behavior: "variable",
  traceability: "direct",
  amount: "8000.00",
};

// BUG-010: `concept`, `behavior` and `traceability` resolved to
// `nameString`/`codeString` in lib/db/formats.ts, neither declaring an `error:`,
// so Zod 4 sent its internal English message ("Too small: expected string to
// have >=1 characters") to the form through `toAppError` → `field-errors.ts` →
// `setError`.
describe("createBusinessCostLineInputSchema", () => {
  it("accepts a complete valid cost line", () => {
    expect(createBusinessCostLineInputSchema.safeParse(validBusinessCostLine).success).toBe(true);
  });

  it.each([
    {
      key: "concept",
      value: "",
      message: "Escribí el concepto del costo.",
    },
    {
      key: "behavior",
      value: "no-es-una-opcion",
      message: "Elegí cómo se comporta el costo: fijo o variable.",
    },
    {
      key: "traceability",
      value: "no-es-una-opcion",
      message: "Elegí cómo se relaciona el costo con el producto: directo o indirecto.",
    },
  ])("reports the Spanish message for $key", ({ key, value, message }) => {
    expect(
      fieldErrors(createBusinessCostLineInputSchema, {
        ...validBusinessCostLine,
        [key]: value,
      }),
    ).toEqual({
      [key]: [message],
    });
  });

  it("reports the Spanish message when the concept is not a string", () => {
    expect(
      fieldErrors(createBusinessCostLineInputSchema, { ...validBusinessCostLine, concept: 42 }),
    ).toEqual({ concept: ["Escribí el concepto del costo."] });
  });

  it("reports a Spanish message for the maximum length", () => {
    expect(
      fieldErrors(createBusinessCostLineInputSchema, {
        ...validBusinessCostLine,
        concept: "a".repeat(201),
      }),
    ).toEqual({
      concept: ["El concepto del costo debe tener como máximo 200 caracteres."],
    });
  });

  it("drops server-controlled fields when the input carries them", () => {
    const result = createBusinessCostLineInputSchema.parse({
      ...validBusinessCostLine,
      id: SERVER_ID,
      businessId: SERVER_ID,
      createdAt: SERVER_TIMESTAMP,
      updatedAt: SERVER_TIMESTAMP,
    });

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("businessId");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });
});

describe("createCalcCostLineInputSchema", () => {
  it("accepts a complete valid cost line", () => {
    expect(createCalcCostLineInputSchema.safeParse(validCalcCostLine).success).toBe(true);
  });

  it.each([
    {
      key: "concept",
      value: "",
      message: "Escribí el concepto del costo.",
    },
    {
      key: "behavior",
      value: "no-es-una-opcion",
      message: "Elegí cómo se comporta el costo: fijo o variable.",
    },
    {
      key: "traceability",
      value: "no-es-una-opcion",
      message: "Elegí cómo se relaciona el costo con el producto: directo o indirecto.",
    },
  ])("reports the Spanish message for $key on the calculation line", ({ key, value, message }) => {
    expect(
      fieldErrors(createCalcCostLineInputSchema, { ...validCalcCostLine, [key]: value }),
    ).toEqual({
      [key]: [message],
    });
  });

  it("drops server-controlled fields when the input carries them", () => {
    const result = createCalcCostLineInputSchema.parse({
      ...validCalcCostLine,
      id: SERVER_ID,
      calculationId: SERVER_ID,
      createdAt: SERVER_TIMESTAMP,
      updatedAt: SERVER_TIMESTAMP,
    });

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("calculationId");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });
});
