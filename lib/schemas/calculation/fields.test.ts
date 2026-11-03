import { describe, expect, it } from "vitest";

import { expectedMarginField } from "./fields";

// No form contract exposes expectedMarginField (step 6 validates the typed
// margin with the field itself), so the rule is tested here.
function firstIssue(input: unknown): string | undefined {
  const result = expectedMarginField.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("expectedMarginField", () => {
  it.each(["0", "30", "99.9999", " 45.5 ", "007"])("accepts %j", (input) => {
    expect(expectedMarginField.safeParse(input).success).toBe(true);
  });

  it("returns the trimmed value when the margin has surrounding spaces", () => {
    expect(expectedMarginField.parse(" 30 ")).toBe("30");
  });

  it.each([
    { input: "", message: "Escribí el margen que querés ganar." },
    { input: "   ", message: "Escribí el margen que querés ganar." },
    { input: 30, message: "Escribí el margen que querés ganar." },
    { input: "abc", message: "El margen debe ser un número." },
    { input: "30,5", message: "El margen debe ser un número." },
    { input: "-1", message: "El margen no puede ser negativo." },
    { input: "100", message: "El margen tiene que ser menor que 100 %." },
    { input: "150.5", message: "El margen tiene que ser menor que 100 %." },
    { input: "30.12345", message: "El margen debe tener hasta 4 decimales." },
  ])("reports $message when the margin is $input", ({ input, message }) => {
    expect(firstIssue(input)).toBe(message);
  });
});
