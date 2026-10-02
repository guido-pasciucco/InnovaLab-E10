import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createProductInputSchema, upsertCostingSetupInputSchema } from "./validation";

// The DB input schemas reuse the field rules from lib/schemas/calculator-setup/fields.ts,
// so they enforce the same constraints and messages as the form contract.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

const validCostingSetup = {
  currency: "ARS",
  costingPeriod: "Mensual",
  costingUnit: "caja",
  estimatedVolume: 6,
};

describe("upsertCostingSetupInputSchema", () => {
  it("accepts a valid costing setup with an integer volume", () => {
    expect(upsertCostingSetupInputSchema.safeParse(validCostingSetup).success).toBe(true);
  });

  it("rejects a non-ARS currency with the shared message", () => {
    expect(fieldErrors(upsertCostingSetupInputSchema, { ...validCostingSetup, currency: "USD" })).toEqual({
      currency: ["La moneda es ARS y no se puede cambiar."],
    });
  });

  it("rejects a non-monthly period with the shared message", () => {
    expect(
      fieldErrors(upsertCostingSetupInputSchema, { ...validCostingSetup, costingPeriod: "Anual" }),
    ).toEqual({
      costingPeriod: ["El período es mensual y no se puede cambiar."],
    });
  });

  it("rejects a whitespace-only unit with the shared message", () => {
    expect(fieldErrors(upsertCostingSetupInputSchema, { ...validCostingSetup, costingUnit: "  " })).toEqual({
      costingUnit: ["Escribí en qué unidad lo vendés (ej: caja, paquete, kilo)."],
    });
  });

  it("rejects a fractional volume with the shared message", () => {
    expect(
      fieldErrors(upsertCostingSetupInputSchema, { ...validCostingSetup, estimatedVolume: 1.5 }),
    ).toEqual({
      estimatedVolume: ["Completá el volumen con un número entero."],
    });
  });

  it("rejects a zero volume with the shared message", () => {
    expect(fieldErrors(upsertCostingSetupInputSchema, { ...validCostingSetup, estimatedVolume: 0 })).toEqual({
      estimatedVolume: ["El volumen tiene que ser mayor que 0."],
    });
  });
});

describe("createProductInputSchema", () => {
  it("rejects a whitespace-only name with the shared message", () => {
    expect(fieldErrors(createProductInputSchema, { name: "   " })).toEqual({
      name: ["Escribí el nombre de tu producto."],
    });
  });
});
