import { describe, expect, it } from "vitest";
import { z } from "zod";
import { calculatorSetupSchema } from "./calculator-setup";

// Messages are defined once in the schema and shown on both sides:
// by RHF in the client and by the service's ZodError on the server.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

const validSetup = {
  name: "Alfajores de maicena",
  unit: "caja",
  volume: 6,
  currency: "ARS",
  period: "Mensual",
};

describe("calculatorSetupSchema", () => {
  it.each([
    ["name", 120],
    ["unit", 40],
  ] as const)("accepts %s when it reaches the %i-character limit", (field, limit) => {
    expect(calculatorSetupSchema.safeParse({ ...validSetup, [field]: "a".repeat(limit) }).success).toBe(true);
  });

  it.each([
    ["name", 121, "El nombre del producto debe tener como máximo 120 caracteres."],
    ["unit", 41, "La unidad debe tener como máximo 40 caracteres."],
  ] as const)("rejects %s when it has %i characters", (field, length, message) => {
    expect(fieldErrors(calculatorSetupSchema, { ...validSetup, [field]: "a".repeat(length) })).toEqual({
      [field]: [message],
    });
  });

  it("accepts a complete valid setup", () => {
    expect(calculatorSetupSchema.safeParse(validSetup).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(fieldErrors(calculatorSetupSchema, { ...validSetup, name: "" })).toEqual({
      name: ["Escribí el nombre de tu producto."],
    });
  });

  it("rejects a whitespace-only name", () => {
    expect(fieldErrors(calculatorSetupSchema, { ...validSetup, name: "   " })).toEqual({
      name: ["Escribí el nombre de tu producto."],
    });
  });

  it("rejects an empty unit", () => {
    expect(fieldErrors(calculatorSetupSchema, { ...validSetup, unit: "" })).toEqual({
      unit: ["Escribí en qué unidad lo vendés (ej: caja, paquete, kilo)."],
    });
  });

  it("rejects a whitespace-only unit", () => {
    expect(fieldErrors(calculatorSetupSchema, { ...validSetup, unit: "  " })).toEqual({
      unit: ["Escribí en qué unidad lo vendés (ej: caja, paquete, kilo)."],
    });
  });

  it("rejects a zero volume", () => {
    expect(fieldErrors(calculatorSetupSchema, { ...validSetup, volume: 0 })).toEqual({
      volume: ["El volumen tiene que ser mayor que 0."],
    });
  });

  it("rejects a negative volume", () => {
    expect(fieldErrors(calculatorSetupSchema, { ...validSetup, volume: -5 })).toEqual({
      volume: ["El volumen tiene que ser mayor que 0."],
    });
  });

  it("rejects a fractional volume", () => {
    expect(fieldErrors(calculatorSetupSchema, { ...validSetup, volume: 1.5 })).toEqual({
      volume: ["Completá el volumen con un número entero."],
    });
  });

  it("rejects a non-ARS currency", () => {
    expect(fieldErrors(calculatorSetupSchema, { ...validSetup, currency: "USD" })).toEqual({
      currency: ["La moneda es ARS y no se puede cambiar."],
    });
  });

  it("rejects a non-monthly period", () => {
    expect(fieldErrors(calculatorSetupSchema, { ...validSetup, period: "Anual" })).toEqual({
      period: ["El período es mensual y no se puede cambiar."],
    });
  });
});
