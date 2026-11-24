import { describe, expect, it } from "vitest";

import {
  canonicalSupplyUnit,
  getSupplyUnit,
  getSupplyUnitFamily,
  getSupplyUnitsForFamily,
  getSupplyUnitBasis,
  isRecipeUnitAllowed,
  SUPPLY_UNITS,
} from "./units";

describe("supply units catalog", () => {
  it("maps every catalog unit to its minimum unit and factor", () => {
    expect(getSupplyUnit("kg")).toMatchObject({
      value: "kg",
      factor: "1000",
    });
    expect(getSupplyUnit("L")).toMatchObject({
      value: "L",
      factor: "1000",
    });
    expect(getSupplyUnit("m")).toMatchObject({
      value: "m",
      factor: "1000",
    });
    expect(getSupplyUnit("cm")).toMatchObject({
      value: "cm",
      factor: "10",
    });
    expect(getSupplyUnit("docena")).toMatchObject({
      value: "docena",
      factor: "12",
    });
    expect(getSupplyUnit("media docena")).toMatchObject({
      value: "media docena",
      factor: "6",
    });
    expect(getSupplyUnit("par")).toMatchObject({
      value: "par",
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

  it("exposes the family and the units inside it", () => {
    expect(getSupplyUnitFamily("KILOS")).toBe("mass");
    expect(getSupplyUnitFamily("litro")).toBe("volume");
    expect(getSupplyUnitFamily("caja")).toBeNull();

    expect(getSupplyUnitsForFamily("mass").map((unit) => unit.value)).toEqual([
      "g",
      "kg",
    ]);
    expect(getSupplyUnitsForFamily("volume").map((unit) => unit.value)).toEqual([
      "ml",
      "L",
    ]);
  });

  it("derives the minimum unit and factor of a purchase unit from the catalog", () => {
    expect(getSupplyUnitBasis("kg")).toEqual({ minimumUnit: "g", conversionFactor: "1000" });
    expect(getSupplyUnitBasis("docena")).toEqual({ minimumUnit: "unidad", conversionFactor: "12" });
    expect(getSupplyUnitBasis(" Litros ")).toEqual({ minimumUnit: "ml", conversionFactor: "1000" });
  });

  it("has no basis for a unit outside the catalog", () => {
    expect(getSupplyUnitBasis("caja")).toBeNull();
    expect(getSupplyUnitBasis("")).toBeNull();
  });

  it("exposes a unique value per catalog entry", () => {
    const values = SUPPLY_UNITS.map((unit) => unit.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("isRecipeUnitAllowed", () => {
  it("accepts any catalog unit of the same family", () => {
    expect(isRecipeUnitAllowed("mass", "g")).toBe(true);
    expect(isRecipeUnitAllowed("mass", "kilo")).toBe(true);
    expect(isRecipeUnitAllowed("count", "media docena")).toBe(true);
  });

  it("rejects another family, free text and a supply without family", () => {
    expect(isRecipeUnitAllowed("mass", "ml")).toBe(false);
    expect(isRecipeUnitAllowed("count", "caja")).toBe(false);
    expect(isRecipeUnitAllowed(null, "g")).toBe(false);
  });
});
