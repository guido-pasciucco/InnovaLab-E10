import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  amountField,
  behaviorField,
  conceptField,
  isOwnLaborField,
  traceabilityField,
} from "./fields";

// One case per field, asserting the message the user reads. `lib/schemas/AGENTS.md`
// says a `fields.ts` needs no tests of its own when a contract exposes the
// field, but the cost contract only reaches the form: the enum messages and
// the amount messages have no other home, so a message that falls back to
// Zod's English default would go unnoticed. This file is that net (#156).
function firstMessage(schema: z.ZodType, input: unknown): string | undefined {
  const result = schema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("conceptField", () => {
  it("asks for the concept when it is empty", () => {
    expect(firstMessage(conceptField, "")).toBe("Escribí el concepto del costo.");
  });

  it("asks for the concept when it is whitespace-only", () => {
    expect(firstMessage(conceptField, "   ")).toBe("Escribí el concepto del costo.");
  });

  it("asks for the concept when it is not a string", () => {
    expect(firstMessage(conceptField, 42)).toBe("Escribí el concepto del costo.");
  });

  it("states the limit when the concept is too long", () => {
    expect(firstMessage(conceptField, "a".repeat(201))).toBe(
      "El concepto del costo debe tener como máximo 200 caracteres.",
    );
  });

  it("accepts a concept within the limit", () => {
    expect(conceptField.safeParse("Alquiler del taller").success).toBe(true);
  });
});

describe("amountField", () => {
  it("says the amount is required when it is empty", () => {
    expect(firstMessage(amountField, "")).toBe("El importe es obligatorio.");
  });

  it("says the amount is required when it is whitespace-only", () => {
    expect(firstMessage(amountField, "   ")).toBe("El importe es obligatorio.");
  });

  it("says the amount must be a number when it is not one", () => {
    expect(firstMessage(amountField, "texto")).toBe("El importe debe ser un número.");
  });

  it("says the amount must be a number when it is not a string", () => {
    expect(firstMessage(amountField, 42)).toBe("El importe debe ser un número.");
  });

  it("says the amount cannot be negative", () => {
    expect(firstMessage(amountField, "-1")).toBe("El importe no puede ser negativo.");
  });

  it("says the amount takes at most two decimals", () => {
    expect(firstMessage(amountField, "10.123")).toBe(
      "El importe debe tener hasta 2 decimales.",
    );
  });

  it("rejects an amount longer than the column holds", () => {
    // numeric(12,2) fits 10 integer digits (BUG-004).
    expect(firstMessage(amountField, "99999999999.99")).toBe(
      "El importe debe ser un número.",
    );
  });

  it("accepts an amount at the column limit", () => {
    expect(amountField.safeParse("9999999999.99").success).toBe(true);
  });
});

describe("behaviorField", () => {
  it("states the two options when the value is not one of them", () => {
    expect(firstMessage(behaviorField, "own_labor")).toBe(
      "Elegí cómo se comporta el costo: fijo o variable.",
    );
  });

  it.each(["fixed", "variable"])("accepts %j", (value) => {
    expect(behaviorField.safeParse(value).success).toBe(true);
  });
});

describe("traceabilityField", () => {
  it("states the two options when the value is not one of them", () => {
    expect(firstMessage(traceabilityField, "trabajo-propio")).toBe(
      "Elegí cómo se relaciona el costo con el producto: directo o indirecto.",
    );
  });

  it.each(["direct", "indirect"])("accepts %j", (value) => {
    expect(traceabilityField.safeParse(value).success).toBe(true);
  });
});

describe("isOwnLaborField", () => {
  it("asks for a boolean when the value is not one", () => {
    expect(firstMessage(isOwnLaborField, "sí")).toBe(
      "Indicá si el costo es trabajo propio.",
    );
  });

  it.each([true, false])("accepts %j", (value) => {
    expect(isOwnLaborField.safeParse(value).success).toBe(true);
  });
});