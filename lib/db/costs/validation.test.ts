import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  addCalcCostLineInputSchema,
  addVariableCalcCostLineInputSchema,
  calcCostLineRowSchema,
  createBusinessCostLineInputSchema,
  createCalcCostLineInputSchema,
  listCalcCostLinesOptionsSchema,
  saveOwnLaborInputSchema,
  updateCalcCostLineAmountInputSchema,
  updateCalcCostLineConceptInputSchema,
  updateCalcCostLineYieldInputSchema,
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
//
// This PR also replaces `moneyString` with `amountField` on the amount columns,
// so the same Spanish messages the form shows reach the server too.
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

  it("rejects a negative amount on the business line", () => {
    expect(
      fieldErrors(createBusinessCostLineInputSchema, {
        ...validBusinessCostLine,
        amountPeriod: "-1",
      }),
    ).toEqual({ amountPeriod: ["El importe no puede ser negativo."] });
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

  it("rejects a negative amount on the calculation line", () => {
    expect(
      fieldErrors(createCalcCostLineInputSchema, { ...validCalcCostLine, amount: "-1" }),
    ).toEqual({ amount: ["El importe no puede ser negativo."] });
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

  it("accepts a calculation line when the catalog source is null", () => {
    expect(
      createCalcCostLineInputSchema.safeParse({
        ...validCalcCostLine,
        sourceBusinessCostId: null,
      }).success,
    ).toBe(true);
  });
});

describe("addCalcCostLineInputSchema", () => {
  it("accepts a concept and an amount", () => {
    expect(
      addCalcCostLineInputSchema.parse({ concept: "Alquiler", amount: "60000.00" }),
    ).toEqual({ concept: "Alquiler", amount: "60000.00" });
  });

  it("drops behavior, traceability and ids when the input carries them", () => {
    const result = addCalcCostLineInputSchema.parse({
      concept: "Alquiler",
      amount: "60000.00",
      behavior: "variable",
      traceability: "indirect",
      id: SERVER_ID,
      sourceBusinessCostId: SERVER_ID,
    });

    expect(result).toEqual({ concept: "Alquiler", amount: "60000.00" });
  });

  it("reports the Spanish message when the amount is negative", () => {
    expect(
      fieldErrors(addCalcCostLineInputSchema, { concept: "Alquiler", amount: "-1" }),
    ).toEqual({ amount: ["El importe no puede ser negativo."] });
  });
});

describe("listCalcCostLinesOptionsSchema", () => {
  it("accepts a fixed behavior filter", () => {
    expect(listCalcCostLinesOptionsSchema.parse({ behavior: "fixed" })).toEqual({
      behavior: "fixed",
    });
  });

  it("rejects a behavior outside fixed and variable", () => {
    expect(listCalcCostLinesOptionsSchema.safeParse({ behavior: "fijo" }).success).toBe(
      false,
    );
  });
});

describe("updateCalcCostLineAmountInputSchema", () => {
  it("accepts an amount", () => {
    expect(updateCalcCostLineAmountInputSchema.parse({ amount: "70000.00" })).toEqual({
      amount: "70000.00",
    });
  });

  it("drops concept and behavior when the input carries them", () => {
    expect(
      updateCalcCostLineAmountInputSchema.parse({
        amount: "70000.00",
        concept: "Otro",
        behavior: "variable",
      }),
    ).toEqual({ amount: "70000.00" });
  });

  it("reports the Spanish message when the amount is negative", () => {
    expect(fieldErrors(updateCalcCostLineAmountInputSchema, { amount: "-1" })).toEqual({
      amount: ["El importe no puede ser negativo."],
    });
  });
});

describe("updateCalcCostLineConceptInputSchema", () => {
  it("accepts a concept and trims it", () => {
    expect(updateCalcCostLineConceptInputSchema.parse({ concept: "  Alquiler  " })).toEqual({
      concept: "Alquiler",
    });
  });

  it("drops amount and behavior when the input carries them", () => {
    expect(
      updateCalcCostLineConceptInputSchema.parse({
        concept: "Alquiler",
        amount: "1.00",
        behavior: "variable",
      }),
    ).toEqual({ concept: "Alquiler" });
  });

  it("reports the Spanish message when the concept is empty", () => {
    expect(fieldErrors(updateCalcCostLineConceptInputSchema, { concept: "   " })).toEqual({
      concept: ["Escribí el concepto del costo."],
    });
  });

  it("reports the Spanish message when the concept is too long", () => {
    expect(
      fieldErrors(updateCalcCostLineConceptInputSchema, { concept: "a".repeat(201) }),
    ).toEqual({
      concept: ["El concepto del costo debe tener como máximo 200 caracteres."],
    });
  });
});

// Paso 4 sends both values of the own-labor line, each one a string or null:
// an empty input is null and the service saves the line with amount 0.
describe("saveOwnLaborInputSchema", () => {
  it("accepts hours and hourly rate", () => {
    expect(saveOwnLaborInputSchema.parse({ hours: "10", hourlyRate: "20000" })).toEqual({
      hours: "10",
      hourlyRate: "20000",
    });
  });

  it("accepts a null on either side or on both", () => {
    expect(saveOwnLaborInputSchema.safeParse({ hours: "10", hourlyRate: null }).success).toBe(true);
    expect(saveOwnLaborInputSchema.safeParse({ hours: null, hourlyRate: "20000" }).success).toBe(true);
    expect(saveOwnLaborInputSchema.safeParse({ hours: null, hourlyRate: null }).success).toBe(true);
  });

  it("requires both keys", () => {
    expect(saveOwnLaborInputSchema.safeParse({ hours: "10" }).success).toBe(false);
  });

  it("reports the Spanish message of each field", () => {
    expect(fieldErrors(saveOwnLaborInputSchema, { hours: "-1", hourlyRate: "texto" })).toEqual({
      hours: ["Las horas no pueden ser negativas."],
      hourlyRate: ["El importe debe ser un número."],
    });
  });
});

describe("isOwnLabor in the calc cost line schemas", () => {
  it("is a boolean on the persisted row", () => {
    const row = {
      id: SERVER_ID,
      calculationId: SERVER_ID,
      scenarioId: null,
      sourceBusinessCostId: null,
      concept: "Trabajo propio",
      behavior: "fixed",
      traceability: "indirect",
      amount: "200000.00",
      hours: null,
      hourlyRate: null,
      allocationPct: null,
      yieldQuantity: "1.0000",
      createdAt: SERVER_TIMESTAMP,
      updatedAt: SERVER_TIMESTAMP,
    };

    expect(calcCostLineRowSchema.safeParse({ ...row, isOwnLabor: true }).success).toBe(true);
    expect(calcCostLineRowSchema.safeParse(row).success).toBe(false);
  });

  it("is optional on the create input, so it defaults to false in the column", () => {
    expect(createCalcCostLineInputSchema.safeParse(validCalcCostLine).success).toBe(true);
    expect(
      createCalcCostLineInputSchema.safeParse({ ...validCalcCostLine, isOwnLabor: true }).success,
    ).toBe(true);
  });

  it("is not part of the paso 2 add input", () => {
    expect(
      addCalcCostLineInputSchema.parse({ concept: "Alquiler", amount: "1.00", isOwnLabor: true }),
    ).toEqual({ concept: "Alquiler", amount: "1.00" });
  });
});

describe("yieldQuantity in the calc cost line schemas", () => {
  it("is optional on the paso 3 add input, so it defaults to 1 in the column", () => {
    expect(addVariableCalcCostLineInputSchema.parse({ concept: "Rollo", amount: "30000" })).toEqual({
      concept: "Rollo",
      amount: "30000",
    });
  });

  it("keeps a valid yield on the paso 3 add input", () => {
    expect(
      addVariableCalcCostLineInputSchema.parse({
        concept: "Rollo",
        amount: "30000",
        yieldQuantity: "20",
      }),
    ).toEqual({ concept: "Rollo", amount: "30000", yieldQuantity: "20" });
  });

  it("uses the shared yield rule on the add input", () => {
    expect(
      fieldErrors(addVariableCalcCostLineInputSchema, {
        concept: "Rollo",
        amount: "30000",
        yieldQuantity: "0",
      }),
    ).toEqual({ yieldQuantity: ["El rendimiento debe ser mayor que cero."] });
  });

  it("is not part of the paso 2 add input", () => {
    expect(
      addCalcCostLineInputSchema.parse({ concept: "Alquiler", amount: "1.00", yieldQuantity: "5" }),
    ).toEqual({ concept: "Alquiler", amount: "1.00" });
  });

  it("is the only field of the yield update input", () => {
    expect(
      updateCalcCostLineYieldInputSchema.parse({ yieldQuantity: "20", amount: "1.00" }),
    ).toEqual({ yieldQuantity: "20" });
    expect(fieldErrors(updateCalcCostLineYieldInputSchema, {})).toEqual({
      yieldQuantity: ["El rendimiento debe ser un número."],
    });
  });

  it("validates the yield on the create input", () => {
    expect(
      fieldErrors(createCalcCostLineInputSchema, { ...validCalcCostLine, yieldQuantity: "-1" }),
    ).toEqual({ yieldQuantity: ["El rendimiento debe ser mayor que cero."] });
  });
});
