import { describe, expect, it } from "vitest";
import { z } from "zod";
import { emailField, passwordField } from "./fields";

// Shared auth rules: every contract and form-only field reuses these, so a
// rule change (e.g. a longer minimum password) reaches all of them at once.
function firstMessage(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("emailField", () => {
  it("rejects an invalid email with the shared message", () => {
    expect(firstMessage(emailField, "x")).toBe("Enter a valid email address");
  });
});

describe("passwordField", () => {
  it("rejects a short password with the shared message", () => {
    expect(firstMessage(passwordField, "1234567")).toBe("Password must be at least 8 characters");
  });

  it("accepts an 8-character password", () => {
    expect(passwordField.safeParse("12345678").success).toBe(true);
  });
});
