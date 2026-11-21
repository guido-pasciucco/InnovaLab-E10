import { describe, expect, it } from "vitest";

import {
  canonicalSupplyUnit,
  getSupplyUnit,
  getSupplyUnitFamily,
  getSupplyUnitsForFamily,
  resolveSupplyFamily,
  resolveSupplyUnits,
  resolveSupplyUnitsForUpdate,
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

  it("infers the supply family from purchase unit or minimum unit", () => {
    expect(resolveSupplyFamily("kg", "g")).toBe("mass");
    expect(resolveSupplyFamily("bolsa", "g")).toBe("mass");
    expect(resolveSupplyFamily("bolsa", "unidad")).toBe("count");
    expect(resolveSupplyFamily("bolsa", "caja")).toBeNull();
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

  it("returns null when a supply uses a unit outside the catalog", () => {
    expect(
      resolveSupplyUnits("supply", "bolsa", {
        minimumUnit: "unidad",
        conversionFactor: "1",
      }),
    ).toBeNull();
  });

  it("exposes a unique value per catalog entry", () => {
    const values = SUPPLY_UNITS.map((unit) => unit.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("resolveSupplyUnitsForUpdate", () => {
  const storedLegacy = {
    kind: "supply",
    purchaseUnit: "bolsa",
    minimumUnit: "unidad",
    conversionFactor: "1",
  };

  it("keeps a stored legacy unit and ignores manipulated technical values", () => {
    expect(
      resolveSupplyUnitsForUpdate(storedLegacy, {
        kind: "supply",
        purchaseUnit: "bolsa",
        minimumUnit: "caja",
        conversionFactor: "999",
      }),
    ).toEqual({
      purchaseUnit: "bolsa",
      minimumUnit: "unidad",
      conversionFactor: "1",
    });
  });

  it("rejects changing a legacy unit to another unknown unit", () => {
    expect(
      resolveSupplyUnitsForUpdate(storedLegacy, {
        ...storedLegacy,
        purchaseUnit: "caja",
      }),
    ).toBeNull();
  });

  it("rejects an unknown unit when the stored supply already uses the catalog", () => {
    expect(
      resolveSupplyUnitsForUpdate(
        {
          kind: "supply",
          purchaseUnit: "kg",
          minimumUnit: "g",
          conversionFactor: "1000",
        },
        {
          kind: "supply",
          purchaseUnit: "caja",
          minimumUnit: "g",
          conversionFactor: "1000",
        },
      ),
    ).toBeNull();
  });

  it("migrates a legacy unit to the catalog and derives its technical values", () => {
    expect(
      resolveSupplyUnitsForUpdate(storedLegacy, {
        ...storedLegacy,
        purchaseUnit: "kg",
        minimumUnit: "caja",
        conversionFactor: "999",
      }),
    ).toEqual({
      purchaseUnit: "kg",
      minimumUnit: "g",
      conversionFactor: "1000",
    });
  });

  it("does not treat a packaging row as a legacy supply", () => {
    expect(
      resolveSupplyUnitsForUpdate(
        {
          kind: "packaging",
          purchaseUnit: "bolsa",
          minimumUnit: "unidad",
          conversionFactor: "1",
        },
        {
          kind: "supply",
          purchaseUnit: "bolsa",
          minimumUnit: "unidad",
          conversionFactor: "1",
        },
      ),
    ).toBeNull();
  });

  it("keeps packaging free-text units and technical values", () => {
    expect(
      resolveSupplyUnitsForUpdate(
        {
          kind: "packaging",
          purchaseUnit: "caja",
          minimumUnit: "bolsa",
          conversionFactor: "100",
        },
        {
          kind: "packaging",
          purchaseUnit: "caja",
          minimumUnit: "bolsa",
          conversionFactor: "100",
        },
      ),
    ).toEqual({
      purchaseUnit: "caja",
      minimumUnit: "bolsa",
      conversionFactor: "100",
    });
  });
});
