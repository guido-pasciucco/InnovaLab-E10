import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createSupplyInputSchema, updateSupplyInputSchema } from "./validation";

// DB tests cover shared-field wiring and removal of server-controlled fields
// (see TEST.md). The rules themselves live in lib/schemas/supplies/fields.ts.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

const SERVER_ID = "6f1c2b7e-3d4a-4f5b-9c8d-1e2f3a4b5c6d";
const SERVER_TIMESTAMP = new Date("2026-01-01T00:00:00.000Z");

const validInput = {
  kind: "supply",
  name: "Harina 000",
  purchasePrice: "18750.00",
  purchaseQuantity: "25",
  purchaseUnit: "kg",
  minimumUnit: "g",
  conversionFactor: "1000",
};

describe("createSupplyInputSchema", () => {
  it("accepts a complete valid supply", () => {
    expect(createSupplyInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("drops the server-controlled fields", () => {
    const result = createSupplyInputSchema.safeParse({
      ...validInput,
      id: SERVER_ID,
      userId: SERVER_ID,
      createdAt: SERVER_TIMESTAMP,
      updatedAt: SERVER_TIMESTAMP,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual(validInput);
    expect("id" in result.data).toBe(false);
    expect("userId" in result.data).toBe(false);
  });

  it.each([
    { field: "kind", value: "otro", message: "Elegí si es un insumo o packaging." },
    { field: "name", value: "", message: "Escribí el nombre del insumo." },
    { field: "purchasePrice", value: "", message: "El importe es obligatorio." },
    { field: "purchaseQuantity", value: "0", message: "La cantidad debe ser mayor que cero." },
    {
      field: "purchaseUnit",
      value: "",
      message: "Escribí la unidad de compra (ej: kg, caja, docena).",
    },
    {
      field: "minimumUnit",
      value: "",
      message: "Escribí la unidad mínima (ej: g, ml, unidad).",
    },
    {
      field: "conversionFactor",
      value: "0",
      message: "La equivalencia debe ser mayor que cero.",
    },
  ])("applies the shared rule to $field", ({ field, value, message }) => {
    expect(fieldErrors(createSupplyInputSchema, { ...validInput, [field]: value })).toEqual({
      [field]: [message],
    });
  });
});

describe("updateSupplyInputSchema", () => {
  it("accepts a complete valid supply", () => {
    expect(updateSupplyInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("drops the server-controlled fields", () => {
    const result = updateSupplyInputSchema.safeParse({
      ...validInput,
      id: SERVER_ID,
      userId: SERVER_ID,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual(validInput);
  });
});
