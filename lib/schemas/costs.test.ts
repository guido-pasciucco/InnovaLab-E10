import { describe, expect, it } from "vitest";
import { z } from "zod";
import { costConceptSchema } from "./costs";

function fieldErrors(input: unknown) {
  const result = costConceptSchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("cost schemas", () => {
  it("accepts a valid concept and transforms its amount to a number", () => {
    expect(
      costConceptSchema.parse({
        concept: "alquiler del taller",
        amountRaw: "150000",
        category: "fixed",
      }),
    ).toEqual({
      concept: "alquiler del taller",
      amount: 150000,
      category: "fixed",
    });
  });

  it("reports only the required message for an empty or whitespace-only amount", () => {
    for (const amountRaw of ["", "   "]) {
      expect(
        fieldErrors({ concept: "alquiler del taller", amountRaw, category: "fixed" }),
      ).toEqual({ amountRaw: ["El importe es obligatorio."] });
    }
  });

  it("reports only the negative message for a negative amount", () => {
    expect(
      fieldErrors({ concept: "alquiler del taller", amountRaw: "-1", category: "fixed" }),
    ).toEqual({ amountRaw: ["El importe no puede ser negativo."] });
  });

  it("reports only the numeric message for an amount with text", () => {
    expect(
      fieldErrors({ concept: "alquiler del taller", amountRaw: "texto", category: "fixed" }),
    ).toEqual({ amountRaw: ["El importe debe ser un número."] });
  });
});
