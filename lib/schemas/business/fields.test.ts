import { describe, expect, it } from "vitest";
import { z } from "zod";
import { businessNameField, businessTypeField } from "./fields";

function firstMessage(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("businessNameField", () => {
  it.each([undefined, null, "", "   "])("rejects %j when the name is missing or empty", (input) => {
    expect(firstMessage(businessNameField, input)).toBe("Escribí el nombre de tu negocio.");
  });

  it("trims the name when it has surrounding whitespace", () => {
    expect(businessNameField.parse("  Velas  ")).toBe("Velas");
  });

  it.each([1, 120])("accepts a name when its length is %i", (length) => {
    expect(businessNameField.safeParse("a".repeat(length)).success).toBe(true);
  });

  it("rejects the name when it exceeds 120 characters", () => {
    expect(firstMessage(businessNameField, "a".repeat(121))).toBe(
      "El nombre del negocio debe tener como máximo 120 caracteres.",
    );
  });
});

describe("businessTypeField", () => {
  it.each([undefined, null, "", "   "])("rejects %j when the business type is missing or empty", (input) => {
    expect(firstMessage(businessTypeField, input)).toBe("Escribí el tipo de negocio.");
  });

  it("trims the business type when it has surrounding whitespace", () => {
    expect(businessTypeField.parse("  artesanias  ")).toBe("artesanias");
  });

  it.each([1, 80])("accepts a business type when its length is %i", (length) => {
    expect(businessTypeField.safeParse("a".repeat(length)).success).toBe(true);
  });

  it("rejects the business type when it exceeds 80 characters", () => {
    expect(firstMessage(businessTypeField, "a".repeat(81))).toBe(
      "El tipo de negocio debe tener como máximo 80 caracteres.",
    );
  });
});
