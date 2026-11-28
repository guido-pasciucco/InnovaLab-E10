import { describe, expect, it } from "vitest";

import { decrementPercentField, roundCountField, roundHoursField, startingPriceField } from "./fields";
import { publishFormErrors } from "./publish";

describe("tender field rules (RN-02, RN-09)", () => {
  it("accepts any whole number of hours from 1 to 24 and 2 to 5 rounds", () => {
    expect(roundHoursField.parse("1")).toBe(1);
    expect(roundHoursField.parse("8")).toBe(8);
    expect(roundHoursField.parse("24")).toBe(24);
    expect(roundHoursField.safeParse("0").error?.issues[0]?.message).toBe("Escribí entre 1 y 24 horas.");
    expect(roundHoursField.safeParse("25").error?.issues[0]?.message).toBe("Escribí entre 1 y 24 horas.");
    expect(roundHoursField.safeParse("1.5").error?.issues[0]?.message).toBe("Escribí entre 1 y 24 horas.");
    expect(roundHoursField.safeParse("").error?.issues[0]?.message).toBe("Escribí entre 1 y 24 horas.");
    expect(roundHoursField.safeParse("dos").error?.issues[0]?.message).toBe("Escribí entre 1 y 24 horas.");
    expect(roundCountField.parse("5")).toBe(5);
    expect(roundCountField.safeParse("dos").error?.issues[0]?.message).toBe("Escribí entre 2 y 5 rondas.");
    expect(roundCountField.safeParse("1").error?.issues[0]?.message).toBe("Escribí entre 2 y 5 rondas.");
    expect(roundCountField.safeParse("6").error?.issues[0]?.message).toBe("Escribí entre 2 y 5 rondas.");
  });

  it("takes the % de baja with a decimal comma, above 0 and up to 50", () => {
    expect(decrementPercentField.parse("7,5")).toBe("7.5");
    expect(decrementPercentField.safeParse("0").error?.issues[0]?.message).toBe(
      "El % de baja tiene que ser mayor a 0.",
    );
    expect(decrementPercentField.safeParse("51").error?.issues[0]?.message).toBe(
      "El % de baja puede ser como máximo 50 %.",
    );
  });

  it("requires the starting price (RN-02: obligatorio)", () => {
    expect(startingPriceField.safeParse("").error?.issues[0]?.message).toBe("Escribí el precio de partida.");
    expect(startingPriceField.parse("1.234,5".replace(".", ""))).toBe("1234.5");
  });
});

describe("publishFormErrors", () => {
  it("keys each error by the input path, so it shows under its row", () => {
    const errors = publishFormErrors({
      roundHours: "6",
      roundCount: "4",
      decrementPercent: "10",
      items: [
        { supplyId: "a", quantity: "10", specs: "", startingPrice: "100" },
        { supplyId: "b", quantity: "", specs: "", startingPrice: "100" },
      ],
      supplierIds: [],
    });

    expect(errors).toEqual({
      "items.1.quantity": "Escribí la cantidad.",
      supplierIds: "Dejá al menos un proveedor invitado.",
    });
  });

  it("asks for at least one supply", () => {
    expect(
      publishFormErrors({ roundHours: "6", roundCount: "4", decrementPercent: "10", items: [], supplierIds: ["x"] }),
    ).toEqual({ items: "Elegí entre 1 y 20 insumos." });
  });
});
