import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createBusinessInputSchema, createProductInputSchema } from "./validation";

// The business input schemas reuse the field rules from lib/schemas/calculator-setup/fields.ts,
// so they enforce the same constraints and messages as the form contract.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

const SERVER_ID = "6f1c2b7e-3d4a-4f5b-9c8d-1e2f3a4b5c6d";
const SERVER_TIMESTAMP = new Date("2026-01-01T00:00:00.000Z");

const validBusiness = {
  name: "Velas de cera",
  businessType: "artesanias",
};

const validProduct = {
  name: "Vela aromática",
  skuOrSlug: "vela-aromatica",
  isActive: true,
};

describe("createBusinessInputSchema", () => {
  it("accepts a complete valid business", () => {
    const result = createBusinessInputSchema.safeParse(validBusiness);

    expect(result.success).toBe(true);
  });

  it("rejects the name when it is whitespace-only", () => {
    const errors = fieldErrors(createBusinessInputSchema, { ...validBusiness, name: "   " });

    expect(errors).toEqual({ name: ["Too small: expected string to have >=1 characters"] });
  });

  it("rejects the business type when it exceeds 80 characters", () => {
    const errors = fieldErrors(createBusinessInputSchema, {
      ...validBusiness,
      businessType: "a".repeat(81),
    });

    expect(errors).toEqual({ businessType: ["Too big: expected string to have <=80 characters"] });
  });

  it("drops server-controlled fields when the input carries them", () => {
    const input = {
      ...validBusiness,
      id: SERVER_ID,
      ownerUserId: SERVER_ID,
      createdAt: SERVER_TIMESTAMP,
    };

    const result = createBusinessInputSchema.parse(input);

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("ownerUserId");
    expect(result).not.toHaveProperty("createdAt");
  });
});

describe("createProductInputSchema", () => {
  it("accepts a complete valid product", () => {
    const result = createProductInputSchema.safeParse(validProduct);

    expect(result.success).toBe(true);
  });

  it("rejects a whitespace-only name with the shared message", () => {
    expect(fieldErrors(createProductInputSchema, { name: "   " })).toEqual({
      name: ["Escribí el nombre de tu producto."],
    });
  });

  it("drops server-controlled fields when the input carries them", () => {
    const input = {
      ...validProduct,
      id: SERVER_ID,
      businessId: SERVER_ID,
      createdAt: SERVER_TIMESTAMP,
      updatedAt: SERVER_TIMESTAMP,
    };

    const result = createProductInputSchema.parse(input);

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("businessId");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });
});
