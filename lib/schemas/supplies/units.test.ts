import { describe, expect, it } from "vitest";

import {
  canonicalSupplyUnit,
  getSupplyUnit,
  resolveSupplyUnits,
  SUPPLY_UNITS,
} from "./units";

describe("supply units catalog", () => {
  it("maps every catalog unit to its minimum unit and factor", () => {
    expect(getSupplyUnit("kg")).toMatchObject({
      value: "kg",
      minimumUnit: "g",
      factor: "1000",
    });
    expect(getSupplyUnit("L")).toMatchObject({
      value: "L",
      minimumUnit: "ml",
      factor: "1000",
    });
    expect(getSupplyUnit("m")).toMatchObject({
      value: "m",
      minimumUnit: "mm",
      factor: "1000",
    });
    expect(getSupplyUnit("cm")).toMatchObject({
      value: "cm",
      minimumUnit: "mm",
      factor: "10",
    });
    expect(getSupplyUnit("docena")).toMatchObject({
      value: "docena",
      minimumUnit: "unidad",
      factor: "12",
    });
    expect(getSupplyUnit("media docena")).toMatchObject({
      value: "media docena",
      minimumUnit: "unidad",
      factor: "6",
    });
    expect(getSupplyUnit("par")).toMatchObject({
      value: "par",
      minimumUnit: "unidad",
      factor: "2",
    });
  });

  it("accepts existing free-text aliases", () => {
    expect(getSupplyUnit("KILOGRAMOS")?.value).toBe("kg");
    expect(getSupplyUnit("litro")?.value).toBe("L");
    expect(getSupplyUnit("milímetros")?.value).toBe("mm");
    expect(getSupplyUnit("docenas")?.value).toBe("docena");
    expect(canonicalSupplyUnit(" litros ")).toBe("L");
  });

  it("returns null for units outside the catalog", () => {
    expect(getSupplyUnit("caja")).toBeNull();
    expect(getSupplyUnit("")).toBeNull();
  });

  it("derives units for supplies and preserves them for packaging", () => {
    expect(
      resolveSupplyUnits("supply", "kg", {
        minimumUnit: "kg",
        conversionFactor: "1",
      }),
    ).toEqual({ minimumUnit: "g", conversionFactor: "1000" });

    expect(
      resolveSupplyUnits("packaging", "kg", {
        minimumUnit: "kg",
        conversionFactor: "1",
      }),
    ).toEqual({ minimumUnit: "kg", conversionFactor: "1" });
  });

  it("keeps the fallback when an existing supply has an unknown unit", () => {
    expect(
      resolveSupplyUnits("supply", "bolsa", {
        minimumUnit: "unidad",
        conversionFactor: "1",
      }),
    ).toEqual({ minimumUnit: "unidad", conversionFactor: "1" });
  });

  it("exposes a unique value per catalog entry", () => {
    const values = SUPPLY_UNITS.map((unit) => unit.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
