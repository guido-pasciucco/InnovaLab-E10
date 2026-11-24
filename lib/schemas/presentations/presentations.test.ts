import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createPresentationFormSchema, toPackagingOptions } from "./presentations";

function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

const options = [{ id: "box", name: "Caja", family: "count", defaultUnit: "unidad" }] as const;
const schema = createPresentationFormSchema(options);

const validPresentation = {
  name: "Caja x6",
  unitsPerPresentation: "6",
  packaging: [{ supplyId: "box", quantity: "1", unit: "unidad" }],
};

describe("createPresentationFormSchema", () => {
  it("accepts a complete presentation", () => {
    expect(schema.safeParse(validPresentation).success).toBe(true);
  });

  it("accepts a presentation without packaging", () => {
    expect(schema.safeParse({ ...validPresentation, packaging: [] }).success).toBe(true);
  });

  it("asks for the name", () => {
    expect(fieldErrors(schema, { ...validPresentation, name: " " })).toEqual({
      name: ["Escribí el nombre de la presentación."],
    });
  });

  it.each(["", "0", "2.5", "-6", "abc", "1000000"])("rejects %j units", (units) => {
    expect(fieldErrors(schema, { ...validPresentation, unitsPerPresentation: units })).toEqual({
      unitsPerPresentation: ["Ingresá un número entero de unidades, mayor que 0."],
    });
  });

  it("rejects a packaging outside the catalog", () => {
    expect(
      fieldErrors(schema, {
        ...validPresentation,
        packaging: [{ supplyId: "gone", quantity: "1", unit: "unidad" }],
      }),
    ).toEqual({ packaging: ["Elegí un packaging de tu catálogo."] });
  });

  it("rejects a unit from another family", () => {
    expect(
      fieldErrors(schema, {
        ...validPresentation,
        packaging: [{ supplyId: "box", quantity: "1", unit: "kg" }],
      }),
    ).toEqual({ packaging: ["Elegí una unidad de medida de la misma familia que el packaging."] });
  });

  it("rejects the same packaging twice", () => {
    const line = validPresentation.packaging[0]!;
    expect(
      fieldErrors(schema, { ...validPresentation, packaging: [line, line] }),
    ).toEqual({ packaging: ["Ese packaging ya está en la presentación."] });
  });
});

describe("toPackagingOptions", () => {
  it("offers only packaging with its family and default unit", () => {
    expect(
      toPackagingOptions([
        { id: "flour", name: "Harina", kind: "supply", purchaseUnit: "kg", minimumUnit: "g" },
        { id: "box", name: "Caja", kind: "packaging", purchaseUnit: "docena", minimumUnit: "unidad" },
      ]),
    ).toEqual([{ id: "box", name: "Caja", family: "count", defaultUnit: "unidad" }]);
  });
});
