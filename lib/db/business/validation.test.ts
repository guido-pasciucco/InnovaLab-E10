import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createProductInputSchema } from "./validation";

// The business input schemas reuse the field rules from lib/schemas/calculator-setup/fields.ts,
// so they enforce the same constraints and messages as the form contract.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("createProductInputSchema", () => {
  it("rejects a whitespace-only name with the shared message", () => {
    expect(fieldErrors(createProductInputSchema, { name: "   " })).toEqual({
      name: ["Escribí el nombre de tu producto."],
    });
  });
});
