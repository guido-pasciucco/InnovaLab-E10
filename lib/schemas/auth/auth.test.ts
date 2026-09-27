import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  loginSchema,
  passwordResetRequestSchema,
  passwordUpdateSchema,
  signupSchema,
} from "./auth";

// Messages are defined once in the schema and shown on both sides:
// by RHF in the client and by the service's ZodError on the server.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("auth schemas", () => {
  it("uses readable messages for login fields", () => {
    expect(fieldErrors(loginSchema, { email: "x", password: "1" })).toEqual({
      email: ["Enter a valid email address"],
      password: ["Password must be at least 8 characters"],
    });
  });

  it("uses readable messages for signup fields", () => {
    expect(
      fieldErrors(signupSchema, { email: "x", password: "1", displayName: "a".repeat(81) }),
    ).toEqual({
      email: ["Enter a valid email address"],
      password: ["Password must be at least 8 characters"],
      displayName: ["Name must be at most 80 characters"],
    });
  });

  it("accepts an empty display name (the field is optional in the form)", () => {
    expect(signupSchema.safeParse({ email: "a@b.com", password: "secret123", displayName: "" }).success).toBe(true);
  });

  it("uses readable messages for password reset and update", () => {
    expect(fieldErrors(passwordResetRequestSchema, { email: "x" })).toEqual({
      email: ["Enter a valid email address"],
    });
    expect(fieldErrors(passwordUpdateSchema, { password: "1" })).toEqual({
      password: ["Password must be at least 8 characters"],
    });
  });
});
