import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createCalculationInputSchema,
  createScenarioInputSchema,
  saveCalculatorSetupInputSchema,
  upsertCostingSetupInputSchema,
  upsertPricingInputsInputSchema,
} from "./validation";

// The calculation input schemas reuse the field rules from lib/schemas/calculator-setup/fields.ts,
// so they enforce the same constraints and messages as the form contract.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

const validCostingSetup = {
  currency: "ARS",
  period: "Mensual",
  unit: "caja",
  volume: 6,
};

const validPricingInputs = {
  marginConvention: "sobre precio de venta",
  expectedMarginPct: "30.0000",
};

const validScenario = {
  name: "Escenario optimista",
};

const SERVER_ID = "6f1c2b7e-3d4a-4f5b-9c8d-1e2f3a4b5c6d";
const SERVER_TIMESTAMP = new Date("2026-01-01T00:00:00.000Z");

describe("createCalculationInputSchema", () => {
  it("drops server-controlled fields when the input carries them", () => {
    const input = {
      productId: SERVER_ID,
      id: SERVER_ID,
      userId: SERVER_ID,
      businessId: SERVER_ID,
      status: "final",
      schemaVersion: 2,
      createdAt: SERVER_TIMESTAMP,
      updatedAt: SERVER_TIMESTAMP,
    };

    const result = createCalculationInputSchema.parse(input);

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("businessId");
    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("schemaVersion");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });
});

describe("upsertPricingInputsInputSchema", () => {
  it("accepts a complete valid set of pricing inputs", () => {
    expect(upsertPricingInputsInputSchema.safeParse(validPricingInputs).success).toBe(true);
  });

  // BUG-010: these fields used to resolve to `codeString`/`nameString` in
  // lib/db/formats.ts, with no `error:` declared, so the user saw Zod's
  // internal English message instead of a Spanish one.
  it("reports the Spanish message when the margin convention is empty", () => {
    expect(
      fieldErrors(upsertPricingInputsInputSchema, { ...validPricingInputs, marginConvention: "" }),
    ).toEqual({ marginConvention: ["Escribí la convención de margen."] });
  });

  it("reports the Spanish message when the margin convention is whitespace-only", () => {
    expect(
      fieldErrors(upsertPricingInputsInputSchema, { ...validPricingInputs, marginConvention: "   " }),
    ).toEqual({ marginConvention: ["Escribí la convención de margen."] });
  });

  it("reports the Spanish message when the margin convention is not a string", () => {
    expect(
      fieldErrors(upsertPricingInputsInputSchema, { ...validPricingInputs, marginConvention: 42 }),
    ).toEqual({ marginConvention: ["Escribí la convención de margen."] });
  });

  it("drops server-controlled fields when the input carries them", () => {
    const input = {
      marginConvention: "markup",
      expectedMarginPct: "30.0000",
      manualPrice: "1500.00",
      calculationId: SERVER_ID,
      createdAt: SERVER_TIMESTAMP,
      updatedAt: SERVER_TIMESTAMP,
    };

    const result = upsertPricingInputsInputSchema.parse(input);

    expect(result).not.toHaveProperty("calculationId");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });
});

describe("createScenarioInputSchema", () => {
  it("accepts a complete valid scenario", () => {
    expect(createScenarioInputSchema.safeParse(validScenario).success).toBe(true);
  });

  // BUG-010: same as `marginConvention` above, this used to be `nameString`.
  it.each([
    { value: "", why: "an empty name" },
    { value: "   ", why: "a whitespace-only name" },
    { value: 42, why: "a non-string name" },
  ])("reports the Spanish message for $why", ({ value }) => {
    expect(fieldErrors(createScenarioInputSchema, { ...validScenario, name: value })).toEqual({
      name: ["Escribí el nombre del escenario."],
    });
  });

  it("reports a Spanish message for the maximum length", () => {
    expect(
      fieldErrors(createScenarioInputSchema, { ...validScenario, name: "a".repeat(121) }),
    ).toEqual({
      name: ["El nombre del escenario debe tener como máximo 120 caracteres."],
    });
  });

  it("drops server-controlled fields when the input carries them", () => {
    const input = {
      name: "Escenario base",
      isBase: true,
      id: SERVER_ID,
      calculationId: SERVER_ID,
      createdAt: SERVER_TIMESTAMP,
      updatedAt: SERVER_TIMESTAMP,
    };

    const result = createScenarioInputSchema.parse(input);

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("calculationId");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });
});

describe("upsertCostingSetupInputSchema", () => {
  it("accepts a valid costing setup with an integer volume", () => {
    expect(upsertCostingSetupInputSchema.safeParse(validCostingSetup).success).toBe(true);
  });

  it("drops server-controlled fields when the input carries them", () => {
    const input = {
      ...validCostingSetup,
      calculationId: SERVER_ID,
      createdAt: SERVER_TIMESTAMP,
      updatedAt: SERVER_TIMESTAMP,
    };

    const result = upsertCostingSetupInputSchema.parse(input);

    expect(result).not.toHaveProperty("calculationId");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });

  it("rejects a non-ARS currency with the shared message", () => {
    expect(fieldErrors(upsertCostingSetupInputSchema, { ...validCostingSetup, currency: "USD" })).toEqual({
      currency: ["La moneda es ARS y no se puede cambiar."],
    });
  });

  it("rejects a non-monthly period with the shared message", () => {
    expect(
      fieldErrors(upsertCostingSetupInputSchema, { ...validCostingSetup, period: "Anual" }),
    ).toEqual({
      period: ["El período es mensual y no se puede cambiar."],
    });
  });

  it("rejects a whitespace-only unit with the shared message", () => {
    expect(fieldErrors(upsertCostingSetupInputSchema, { ...validCostingSetup, unit: "  " })).toEqual({
      unit: ["Escribí en qué unidad lo vendés (ej: caja, paquete, kilo)."],
    });
  });

  it("rejects a fractional volume with the shared message", () => {
    expect(
      fieldErrors(upsertCostingSetupInputSchema, { ...validCostingSetup, volume: 1.5 }),
    ).toEqual({
      volume: ["Completá el volumen con un número entero."],
    });
  });

  it("rejects a zero volume with the shared message", () => {
    expect(fieldErrors(upsertCostingSetupInputSchema, { ...validCostingSetup, volume: 0 })).toEqual({
      volume: ["El volumen tiene que ser mayor que 0."],
    });
  });
});

describe("saveCalculatorSetupInputSchema", () => {
  const validSetup = { name: "Alfajores", ...validCostingSetup };

  it("accepts a complete valid calculator setup", () => {
    expect(saveCalculatorSetupInputSchema.parse(validSetup)).toEqual(validSetup);
  });

  it("reports every invalid field at once with the shared messages", () => {
    expect(fieldErrors(saveCalculatorSetupInputSchema, { ...validSetup, name: " ", unit: "" })).toEqual({
      name: ["Escribí el nombre de tu producto."],
      unit: ["Escribí en qué unidad lo vendés (ej: caja, paquete, kilo)."],
    });
  });

  it("drops server-controlled keys sent by the client", () => {
    const parsed = saveCalculatorSetupInputSchema.parse({
      ...validSetup,
      id: "11111111-1111-4111-8111-111111111111",
      businessId: "22222222-2222-4222-8222-222222222222",
      calculationId: "33333333-3333-4333-8333-333333333333",
    });

    expect(parsed).toEqual(validSetup);
  });
});
