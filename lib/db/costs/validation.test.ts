import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  addPeriodCostLineInputSchema,
  createBusinessCostLineInputSchema,
  listPeriodCostsOptionsSchema,
  updatePeriodCostLineAmountInputSchema,
  updatePeriodCostLineConceptInputSchema,
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
  period: "2026-11",
  concept: "Alquiler del taller",
  behavior: "fixed",
  traceability: "indirect",
  amountPeriod: "150000.00",
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

  it.each([["2026-13"], ["2026-1"], ["11-2026"], [""]])(
    "rejects the period %j with the shared message",
    (period) => {
      expect(
        fieldErrors(createBusinessCostLineInputSchema, {
          ...validBusinessCostLine,
          period,
        }),
      ).toEqual({ period: ["El período debe tener el formato AAAA-MM."] });
    },
  );
});

describe("addPeriodCostLineInputSchema", () => {
  it("accepts a concept and an amount without a period", () => {
    expect(
      addPeriodCostLineInputSchema.safeParse({
        concept: "Alquiler del taller",
        amountPeriod: "150000.00",
      }).success,
    ).toBe(true);
  });

  it("accepts an explicit period", () => {
    expect(
      addPeriodCostLineInputSchema.safeParse({
        period: "2026-11",
        concept: "Alquiler del taller",
        amountPeriod: "150000.00",
      }).success,
    ).toBe(true);
  });

  it("does not let the client set behavior, traceability or the owner", () => {
    const result = addPeriodCostLineInputSchema.parse({
      period: "2026-11",
      concept: "Alquiler del taller",
      amountPeriod: "150000.00",
      behavior: "variable",
      traceability: "direct",
      businessId: SERVER_ID,
    });

    expect(result).toEqual({
      period: "2026-11",
      concept: "Alquiler del taller",
      amountPeriod: "150000.00",
    });
  });

  it("reports the shared concept and amount messages", () => {
    expect(
      fieldErrors(addPeriodCostLineInputSchema, {
        concept: "",
        amountPeriod: "-1",
      }),
    ).toEqual({
      concept: ["Escribí el concepto del costo."],
      amountPeriod: ["El importe no puede ser negativo."],
    });
  });
});

describe("listPeriodCostsOptionsSchema", () => {
  it("accepts an empty options object", () => {
    expect(listPeriodCostsOptionsSchema.safeParse({}).success).toBe(true);
  });

  it("rejects an invalid period", () => {
    expect(
      fieldErrors(listPeriodCostsOptionsSchema, { period: "2026-13" }),
    ).toEqual({ period: ["El período debe tener el formato AAAA-MM."] });
  });
});

describe("updatePeriodCostLineAmountInputSchema", () => {
  it("reports the amount message", () => {
    expect(
      fieldErrors(updatePeriodCostLineAmountInputSchema, { amountPeriod: "" }),
    ).toEqual({ amountPeriod: ["El importe es obligatorio."] });
  });
});

describe("updatePeriodCostLineConceptInputSchema", () => {
  it("reports the concept message", () => {
    expect(
      fieldErrors(updatePeriodCostLineConceptInputSchema, { concept: "" }),
    ).toEqual({ concept: ["Escribí el concepto del costo."] });
  });
});
