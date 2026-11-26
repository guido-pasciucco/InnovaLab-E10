import { describe, expect, it } from "vitest";
import { z } from "zod";

import { supplySchema } from "./supplies";

const validSupply = {
  kind: "supply",
  name: "Harina 000",
  purchasePrice: "18750.00",
  purchaseQuantity: "25",
  purchaseUnit: "kg",
};

// Messages are defined once in fields.ts and shown on both sides: by RHF in
// the client and by the service's ZodError on the server.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("supplySchema", () => {
  it("keeps a complete supply and preserves every amount as a string", () => {
    const result = supplySchema.safeParse(validSupply);

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toEqual(validSupply);
  });

  it("accepts packaging as a kind", () => {
    const result = supplySchema.safeParse({ ...validSupply, kind: "packaging" });

    expect(result.success).toBe(true);
  });

  it("reports the enum message for an unknown kind", () => {
    expect(fieldErrors(supplySchema, { ...validSupply, kind: "otro" })).toEqual({
      kind: ["Elegí si es un insumo o packaging."],
    });
  });

  it.each([
    { field: "name", value: "", message: "Escribí el nombre del insumo." },
    { field: "purchasePrice", value: "", message: "El importe es obligatorio." },
    { field: "purchaseQuantity", value: "", message: "La cantidad es obligatoria." },
    {
      field: "purchaseUnit",
      value: "",
      message: "Elegí la unidad de compra (ej: kg, docena, unidad).",
    },
  ])("reports the required message when $field is empty", ({ field, value, message }) => {
    expect(fieldErrors(supplySchema, { ...validSupply, [field]: value })).toEqual({
      [field]: [message],
    });
  });

  it.each(["0", "-2"])(
    "rejects the quantity %j because the engine divides by it",
    (purchaseQuantity) => {
      expect(fieldErrors(supplySchema, { ...validSupply, purchaseQuantity })).toEqual({
        purchaseQuantity: ["La cantidad debe ser mayor que cero."],
      });
    },
  );

  it("rejects more than four quantity decimals", () => {
    expect(fieldErrors(supplySchema, { ...validSupply, purchaseQuantity: "1.23456" })).toEqual({
      purchaseQuantity: ["La cantidad debe tener hasta 4 decimales."],
    });
  });

  it.each([
    { raw: "1,5", normalized: "1.5" },
    { raw: "1,2345", normalized: "1.2345" },
  ])("accepts the comma quantity $raw and stores $normalized", ({ raw, normalized }) => {
    const result = supplySchema.safeParse({ ...validSupply, purchaseQuantity: raw });

    expect(result.success).toBe(true);
    expect(result.success ? result.data.purchaseQuantity : null).toBe(normalized);
  });

  it("rejects more than four quantity decimals written with a comma", () => {
    expect(fieldErrors(supplySchema, { ...validSupply, purchaseQuantity: "1,23456" })).toEqual({
      purchaseQuantity: ["La cantidad debe tener hasta 4 decimales."],
    });
  });

  it.each([",5", "1,", "1,2,3"])(
    "rejects the comma quantity %j because it is not one decimal number",
    (purchaseQuantity) => {
      expect(fieldErrors(supplySchema, { ...validSupply, purchaseQuantity })).toEqual({
        purchaseQuantity: ["La cantidad debe ser un número."],
      });
    },
  );
});
