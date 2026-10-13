import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  loginSchema,
  passwordResetRequestSchema,
  passwordUpdateSchema,
  signupSchema,
} from "./auth";
import { fakerES as faker } from "@faker-js/faker";

const FAKE_PASSWORD = faker.internet.password({ length: 16 });

// Messages are defined once in the schema and shown on both sides:
// by RHF in the client and by the service's ZodError on the server.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("loginSchema", () => {
  it("accepts a complete valid object", () => {
    const result = loginSchema.safeParse({ email: "ana@example.com", password: FAKE_PASSWORD });

    expect(result.success).toBe(true);
  });

  it("uses readable messages for login fields", () => {
    expect(fieldErrors(loginSchema, { email: "x", password: "1" })).toEqual({
      email: ["Ingresá un correo electrónico válido."],
      password: ["La contraseña debe tener al menos 8 caracteres."],
    });
  });
});

describe("signupSchema", () => {
  it("uses readable messages for signup fields", () => {
    expect(
      fieldErrors(signupSchema, { email: "x", password: "1", displayName: "a".repeat(81) }),
    ).toEqual({
      email: ["Ingresá un correo electrónico válido."],
      password: ["La contraseña debe tener al menos 8 caracteres."],
      displayName: ["El nombre debe tener como máximo 80 caracteres."],
    });
  });

  it("accepts an empty display name (the field is optional in the form)", () => {
    expect(signupSchema.safeParse({ email: "a@b.com", password: FAKE_PASSWORD, displayName: "" }).success).toBe(true);
  });
});

describe("passwordResetRequestSchema", () => {
  it("accepts a complete valid object", () => {
    const result = passwordResetRequestSchema.safeParse({ email: "ana@example.com" });

    expect(result.success).toBe(true);
  });

  it("uses readable messages for password reset", () => {
    expect(fieldErrors(passwordResetRequestSchema, { email: "x" })).toEqual({
      email: ["Ingresá un correo electrónico válido."],
    });
  });
});

describe("passwordUpdateSchema", () => {
  it("accepts a password when it has exactly 8 characters", () => {
    const password = faker.internet.password({ length: 8 });

    expect(passwordUpdateSchema.safeParse({ password }).success).toBe(true);
  });

  it("rejects a password when it has 7 characters", () => {
    const password = faker.internet.password({ length: 7 });

    expect(fieldErrors(passwordUpdateSchema, { password })).toEqual({
      password: ["La contraseña debe tener al menos 8 caracteres."],
    });
  });

  it("accepts a complete valid object", () => {
    const result = passwordUpdateSchema.safeParse({ password: FAKE_PASSWORD });

    expect(result.success).toBe(true);
  });

  it("uses readable messages for password update", () => {
    expect(fieldErrors(passwordUpdateSchema, { password: "1" })).toEqual({
      password: ["La contraseña debe tener al menos 8 caracteres."],
    });
  });
});
