import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createBusinessInputSchema,
  createPresentationInputSchema,
  createProductInputSchema,
  savePresentationInputSchema,
  saveProductInputSchema,
  setDefaultMarkupInputSchema,
  setProductMarkupInputSchema,
} from "./validation";

// DB tests cover shared-field wiring and removal of server-controlled fields.
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

const SERVER_ID = "6f1c2b7e-3d4a-4f5b-9c8d-1e2f3a4b5c6d";
const SERVER_TIMESTAMP = new Date("2026-01-01T00:00:00.000Z");

const validBusiness = {
  name: "Velas de cera",
  businessType: "artesanias",
};

const validProduct = {
  name: "Vela aromática",
  skuOrSlug: "vela-aromatica",
  monthlyCapacity: "120",
  isActive: true,
};

const validRecipeProduct = {
  name: "Pan flauta",
  monthlyCapacity: "120",
  yieldQuantity: "12",
  recipe: [{ supplyId: SERVER_ID, quantity: "250", unit: "g" }],
};

describe("createBusinessInputSchema", () => {
  it("accepts a complete valid business", () => {
    const result = createBusinessInputSchema.safeParse(validBusiness);

    expect(result.success).toBe(true);
  });

  it("accepts a business when businessType is omitted", () => {
    const input = { name: validBusiness.name };

    const result = createBusinessInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it("accepts a business when businessType is null", () => {
    const input = { ...validBusiness, businessType: null };

    const result = createBusinessInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it("rejects the name when it is whitespace-only", () => {
    const errors = fieldErrors(createBusinessInputSchema, { ...validBusiness, name: "   " });

    expect(errors).toEqual({ name: ["Escribí el nombre de tu negocio."] });
  });

  it("rejects the business type when it is empty", () => {
    const errors = fieldErrors(createBusinessInputSchema, {
      ...validBusiness,
      businessType: "",
    });

    expect(errors).toEqual({ businessType: ["Escribí el tipo de negocio."] });
  });

  it("drops server-controlled fields when the input carries them", () => {
    const input = {
      ...validBusiness,
      id: SERVER_ID,
      ownerUserId: SERVER_ID,
      createdAt: SERVER_TIMESTAMP,
    };

    const result = createBusinessInputSchema.parse(input);

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("ownerUserId");
    expect(result).not.toHaveProperty("createdAt");
  });
});

describe("createProductInputSchema", () => {
  it("accepts a complete valid product", () => {
    const result = createProductInputSchema.safeParse(validProduct);

    expect(result.success).toBe(true);
  });

  it("rejects a whitespace-only name with the shared message", () => {
    expect(fieldErrors(createProductInputSchema, { name: "   " })).toEqual({
      name: ["Escribí el nombre de tu producto."],
    });
  });

  it.each(["-5", "abc", "2.5"])(
    "rejects the monthly capacity %j with the shared message",
    (monthlyCapacity) => {
      expect(
        fieldErrors(createProductInputSchema, {
          ...validProduct,
          monthlyCapacity,
        }),
      ).toEqual({
        monthlyCapacity: ["Ingresá un número entero de unidades, 0 o mayor."],
      });
    },
  );

  it("drops server-controlled fields when the input carries them", () => {
    const input = {
      ...validProduct,
      id: SERVER_ID,
      businessId: SERVER_ID,
      createdAt: SERVER_TIMESTAMP,
      updatedAt: SERVER_TIMESTAMP,
    };

    const result = createProductInputSchema.parse(input);

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("businessId");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });
});

describe("saveProductInputSchema", () => {
  it("accepts a product with a name and one valid recipe line", () => {
    const result = saveProductInputSchema.safeParse(validRecipeProduct);

    expect(result.success).toBe(true);
  });

  it("normalizes the monthly capacity to an integer", () => {
    const result = saveProductInputSchema.parse(validRecipeProduct);

    expect(result.monthlyCapacity).toBe(120);
  });

  it.each(["", "   "])(
    "stores an empty monthly capacity %j as null",
    (monthlyCapacity) => {
      const result = saveProductInputSchema.parse({
        ...validRecipeProduct,
        monthlyCapacity,
      });

      expect(result.monthlyCapacity).toBeNull();
    },
  );

  it.each(["-5", "abc", "2.5", "1e3"])(
    "rejects the monthly capacity %j with the shared message",
    (monthlyCapacity) => {
      expect(
        fieldErrors(saveProductInputSchema, {
          ...validRecipeProduct,
          monthlyCapacity,
        }),
      ).toEqual({
        monthlyCapacity: ["Ingresá un número entero de unidades, 0 o mayor."],
      });
    },
  );

  it("rejects a whitespace-only name with the shared message", () => {
    expect(
      fieldErrors(saveProductInputSchema, {
        ...validRecipeProduct,
        name: "   ",
      }),
    ).toEqual({ name: ["Escribí el nombre de tu producto."] });
  });

  it("requires at least one recipe line", () => {
    expect(
      fieldErrors(saveProductInputSchema, {
        ...validRecipeProduct,
        recipe: [],
      }),
    ).toEqual({ recipe: ["Agregá al menos un insumo a la receta."] });
  });

  it("rejects a supply id that is not a uuid with the shared message", () => {
    expect(
      fieldErrors(saveProductInputSchema, {
        ...validRecipeProduct,
        recipe: [{ supplyId: "supply-harina", quantity: "250", unit: "g" }],
      }),
    ).toEqual({ recipe: ["Elegí un insumo de tu catálogo."] });
  });

  it("rejects an empty unit with the shared message", () => {
    expect(
      fieldErrors(saveProductInputSchema, {
        ...validRecipeProduct,
        recipe: [{ supplyId: SERVER_ID, quantity: "250", unit: " " }],
      }),
    ).toEqual({ recipe: ["Elegí la unidad de medida del insumo."] });
  });

  it("rejects a unit longer than 40 characters with the shared message", () => {
    expect(
      fieldErrors(saveProductInputSchema, {
        ...validRecipeProduct,
        recipe: [
          { supplyId: SERVER_ID, quantity: "250", unit: "x".repeat(41) },
        ],
      }),
    ).toEqual({
      recipe: ["La unidad de medida debe tener como máximo 40 caracteres."],
    });
  });

  it("rejects a zero quantity with the shared message", () => {
    expect(
      fieldErrors(saveProductInputSchema, {
        ...validRecipeProduct,
        recipe: [{ supplyId: SERVER_ID, quantity: "0", unit: "g" }],
      }),
    ).toEqual({ recipe: ["La cantidad debe ser mayor que 0."] });
  });

  it("accepts a quantity with up to four decimals", () => {
    const result = saveProductInputSchema.safeParse({
      ...validRecipeProduct,
      recipe: [{ supplyId: SERVER_ID, quantity: "0.0001", unit: "g" }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a quantity with more than four decimals with the shared message", () => {
    expect(
      fieldErrors(saveProductInputSchema, {
        ...validRecipeProduct,
        recipe: [{ supplyId: SERVER_ID, quantity: "0.00001", unit: "g" }],
      }),
    ).toEqual({ recipe: ["La cantidad debe tener hasta 4 decimales."] });
  });

  it("rejects the same supply twice in one recipe", () => {
    expect(
      fieldErrors(saveProductInputSchema, {
        ...validRecipeProduct,
        recipe: [
          { supplyId: SERVER_ID, quantity: "250", unit: "g" },
          { supplyId: SERVER_ID, quantity: "100", unit: "g" },
        ],
      }),
    ).toEqual({ recipe: ["Ese insumo ya está en la receta."] });
  });

  it("drops server-controlled fields when the input carries them", () => {
    const result = saveProductInputSchema.parse({
      ...validRecipeProduct,
      id: SERVER_ID,
      businessId: SERVER_ID,
    });

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("businessId");
  });
});

const validPresentation = {
  name: "Caja x6",
  unitsPerPresentation: "6",
};

describe("createPresentationInputSchema", () => {
  it("accepts a whole positive number of units", () => {
    expect(createPresentationInputSchema.safeParse(validPresentation).success).toBe(true);
  });

  it("rejects fractional and non-positive units with the field message", () => {
    for (const units of ["6.5", "0", "-1", "abc"]) {
      expect(fieldErrors(createPresentationInputSchema, { ...validPresentation, unitsPerPresentation: units }))
        .toEqual({ unitsPerPresentation: ["Ingresá un número entero de unidades, mayor que 0."] });
    }
  });

  it("requires a name and drops server-controlled fields", () => {
    expect(fieldErrors(createPresentationInputSchema, { ...validPresentation, name: "" }))
      .toEqual({ name: ["Escribí el nombre de la presentación."] });

    const result = createPresentationInputSchema.parse({
      ...validPresentation,
      id: SERVER_ID,
      productId: SERVER_ID,
      createdAt: SERVER_TIMESTAMP,
    });
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("productId");
    expect(result).not.toHaveProperty("createdAt");
  });
});

describe("savePresentationInputSchema", () => {
  it("keeps the packaging list with quantity, unit and supply id", () => {
    const result = savePresentationInputSchema.parse({
      ...validPresentation,
      packaging: [{ supplyId: SERVER_ID, quantity: "1", unit: "unidad" }],
    });

    expect(result.packaging).toEqual([
      { supplyId: SERVER_ID, quantity: "1", unit: "unidad" },
    ]);
    expect(result.unitsPerPresentation).toBe(6);
  });

  it("rejects the same packaging twice", () => {
    const line = { supplyId: SERVER_ID, quantity: "1", unit: "unidad" };

    expect(
      fieldErrors(savePresentationInputSchema, {
        ...validPresentation,
        packaging: [line, line],
      }),
    ).toEqual({ packaging: ["Ese packaging ya está en la presentación."] });
  });

  it("asks for a packaging of the catalog when the id is not a uuid", () => {
    expect(
      fieldErrors(savePresentationInputSchema, {
        ...validPresentation,
        packaging: [{ supplyId: "caja", quantity: "1", unit: "unidad" }],
      }),
    ).toEqual({ packaging: ["Elegí un packaging de tu catálogo."] });
  });
});

describe("markup input schemas", () => {
  it.each([
    ["defaultMarkupPercent", setDefaultMarkupInputSchema],
    ["markupPercent", setProductMarkupInputSchema],
  ] as const)("applies the shared field rule to %s", (field, schema) => {
    expect(schema.parse({ [field]: "30,5" })).toEqual({ [field]: "30.5" });
    expect(schema.parse({ [field]: null })).toEqual({ [field]: null });
    expect(fieldErrors(schema, { [field]: "0" })).toEqual({
      [field]: ["Con un recargo de 0 o negativo el precio quedaría igual o por debajo del costo."],
    });
  });

  it("rejects an omitted field instead of silently clearing the markup", () => {
    expect(setProductMarkupInputSchema.safeParse({}).success).toBe(false);
    expect(setDefaultMarkupInputSchema.safeParse({}).success).toBe(false);
  });
});
