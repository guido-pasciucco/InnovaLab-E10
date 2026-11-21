import { describe, expect, it } from "vitest";

import { cuitCheckDigit, formatCuit, isValidCuit, normalizeCuit } from "./cuit";
import { cuitField, supplierCategoriesField, supplierTermsField } from "./fields";

describe("CUIT check (RN-23)", () => {
  it("computes the AFIP check digit", () => {
    expect(cuitCheckDigit("2012345678")).toBe(6);
    expect(cuitCheckDigit("3071234567")).toBe(1);
  });

  it("accepts a CUIT whose last digit matches the check digit", () => {
    expect(isValidCuit("20123456786")).toBe(true);
    expect(isValidCuit("30712345671")).toBe(true);
  });

  it("rejects a wrong check digit, a wrong length and letters", () => {
    expect(isValidCuit("20123456787")).toBe(false);
    expect(isValidCuit("2012345678")).toBe(false);
    expect(isValidCuit("2012345678a")).toBe(false);
  });

  it("normalizes dashes, dots and spaces, and formats for display", () => {
    expect(normalizeCuit("20-12345678-6")).toBe("20123456786");
    expect(normalizeCuit("20.12345678 6")).toBe("20123456786");
    expect(formatCuit("20123456786")).toBe("20-12345678-6");
  });
});

describe("cuitField", () => {
  it("stores the 11 bare digits", () => {
    expect(cuitField.parse(" 20-12345678-6 ")).toBe("20123456786");
  });

  it("explains a wrong length and a wrong check digit", () => {
    expect(cuitField.safeParse("20-1234-6").error?.issues[0]?.message).toBe(
      "El CUIT tiene 11 números (por ejemplo, 20-12345678-6).",
    );
    expect(cuitField.safeParse("20-12345678-7").error?.issues[0]?.message).toBe(
      "El CUIT no es válido: revisá el último número.",
    );
  });
});

describe("supplierCategoriesField", () => {
  it("splits by commas, trims and drops empty and repeated rubros", () => {
    expect(supplierCategoriesField.parse("Harinas, lácteos, , harinas ")).toEqual([
      "Harinas",
      "lácteos",
    ]);
  });

  it("requires at least one rubro", () => {
    expect(supplierCategoriesField.safeParse(" , ").error?.issues[0]?.message).toBe(
      "Escribí al menos un rubro.",
    );
  });

  it("caps the list at 10 rubros", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => `rubro ${i}`).join(",");
    expect(supplierCategoriesField.safeParse(eleven).success).toBe(false);
  });
});

describe("supplierTermsField", () => {
  it("accepts a ticked checkbox and rejects a missing one", () => {
    expect(supplierTermsField.parse("on")).toBe(true);
    expect(supplierTermsField.safeParse(undefined).error?.issues[0]?.message).toBe(
      "Para registrarte tenés que aceptar los términos.",
    );
  });
});
