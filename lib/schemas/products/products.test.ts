import { describe, expect, it } from "vitest";

import type { RecipeSupplyOption } from "./products";
import { createProductFormSchema, toRecipeSupplyOptions } from "./products";

// Messages are defined once in the schema and shown by RHF in the client.
// The server reuses the same field rules when persistence lands.
const supplyOptions: RecipeSupplyOption[] = [
  { id: "supply-harina", name: "Harina 000", family: "mass", defaultUnit: "g", minimumUnit: "g" },
  { id: "supply-sal", name: "Sal", family: "mass", defaultUnit: "g", minimumUnit: "g" },
];
const schema = createProductFormSchema(supplyOptions);

function issues(input: unknown, target = schema) {
  const result = target.safeParse(input);

  return result.success
    ? []
    : result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
}

const validProduct = {
  name: "Pan flauta",
  monthlyCapacity: "120",
  recipe: [{ supplyId: "supply-harina", quantity: "250", unit: "g" }],
};

describe("createProductFormSchema", () => {
  it("accepts a product with a name and one recipe item", () => {
    expect(schema.safeParse(validProduct).success).toBe(true);
  });

  it("accepts decimal quantities with up to four decimals", () => {
    expect(
      schema.safeParse({
        ...validProduct,
        recipe: [{ supplyId: "supply-harina", quantity: "0.0001", unit: "g" }],
      }).success,
    ).toBe(true);
  });

  it("accepts another unit from the supply family", () => {
    expect(
      schema.safeParse({
        ...validProduct,
        recipe: [{ supplyId: "supply-harina", quantity: "0.25", unit: "kg" }],
      }).success,
    ).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(issues({ ...validProduct, name: "" })).toEqual([
      { path: "name", message: "Escribí el nombre de tu producto." },
    ]);
  });

  it("rejects a whitespace-only name", () => {
    expect(issues({ ...validProduct, name: "   " })).toEqual([
      { path: "name", message: "Escribí el nombre de tu producto." },
    ]);
  });

  it("rejects a name longer than 120 characters", () => {
    expect(issues({ ...validProduct, name: "a".repeat(121) })).toEqual([
      {
        path: "name",
        message: "El nombre del producto debe tener como máximo 120 caracteres.",
      },
    ]);
  });

  it("rejects an empty recipe", () => {
    expect(issues({ ...validProduct, recipe: [] })).toEqual([
      { path: "recipe", message: "Agregá al menos un insumo a la receta." },
    ]);
  });

  it("rejects an empty supply selection", () => {
    expect(
      issues({
        ...validProduct,
        recipe: [{ supplyId: "", quantity: "250", unit: "g" }],
      }),
    ).toEqual([
      {
        path: "recipe.0.supplyId",
        message: "Elegí un insumo de tu catálogo.",
      },
    ]);
  });

  it("rejects an empty unit", () => {
    expect(
      issues({
        ...validProduct,
        recipe: [{ supplyId: "supply-harina", quantity: "250", unit: "" }],
      }),
    ).toEqual([
      {
        path: "recipe.0.unit",
        message: "Elegí la unidad de medida del insumo.",
      },
    ]);
  });

  it("rejects a unit longer than 40 characters", () => {
    expect(
      issues({
        ...validProduct,
        recipe: [
          {
            supplyId: "supply-harina",
            quantity: "250",
            unit: "x".repeat(41),
          },
        ],
      }),
    ).toEqual([
      {
        path: "recipe.0.unit",
        message: "La unidad de medida debe tener como máximo 40 caracteres.",
      },
    ]);
  });

  it("rejects a catalog unit from another family", () => {
    expect(
      issues({
        ...validProduct,
        recipe: [{ supplyId: "supply-harina", quantity: "1", unit: "L" }],
      }),
    ).toEqual([
      {
        path: "recipe.0.unit",
        message: "Elegí una unidad de medida de la misma familia que el insumo.",
      },
    ]);
  });

  it("rejects a free-text unit for a supply that already uses the catalog", () => {
    expect(
      issues({
        ...validProduct,
        recipe: [{ supplyId: "supply-harina", quantity: "1", unit: "bolsa" }],
      }),
    ).toEqual([
      {
        path: "recipe.0.unit",
        message: "Elegí una unidad de medida de la misma familia que el insumo.",
      },
    ]);
  });

  it("keeps a legacy unit while the line repeats the supply's stored unit", () => {
    const legacyOptions: RecipeSupplyOption[] = [
      { id: "supply-legacy", name: "Harina", family: null, defaultUnit: "bolsa", minimumUnit: "bolsa" },
    ];

    expect(
      createProductFormSchema(legacyOptions).safeParse({
        ...validProduct,
        recipe: [{ supplyId: "supply-legacy", quantity: "1", unit: "bolsa" }],
      }).success,
    ).toBe(true);
  });

  it("rejects changing a legacy unit to another free-text value", () => {
    const legacyOptions: RecipeSupplyOption[] = [
      { id: "supply-legacy", name: "Harina", family: null, defaultUnit: "bolsa", minimumUnit: "bolsa" },
    ];

    expect(
      issues(
        {
          ...validProduct,
          recipe: [{ supplyId: "supply-legacy", quantity: "1", unit: "caja" }],
        },
        createProductFormSchema(legacyOptions),
      ),
    ).toEqual([
      {
        path: "recipe.0.unit",
        message: "Elegí una unidad de medida de la misma familia que el insumo.",
      },
    ]);
  });

  it.each([
    ["", "Indicá la cantidad del insumo."],
    ["abc", "La cantidad debe ser un número."],
    ["0", "La cantidad debe ser mayor que 0."],
    ["-5", "La cantidad debe ser mayor que 0."],
    ["1.23456", "La cantidad debe tener hasta 4 decimales."],
    ["12345678901", "La cantidad es demasiado grande."],
  ])("rejects the quantity %j", (quantity, message) => {
    expect(
      issues({
        ...validProduct,
        recipe: [{ supplyId: "supply-harina", quantity, unit: "g" }],
      }),
    ).toEqual([{ path: "recipe.0.quantity", message }]);
  });

  it("rejects the same supply twice in the recipe", () => {
    expect(
      issues({
        ...validProduct,
        recipe: [
          { supplyId: "supply-harina", quantity: "250", unit: "g" },
          { supplyId: "supply-harina", quantity: "100", unit: "g" },
        ],
      }),
    ).toEqual([
      {
        path: "recipe.1.supplyId",
        message: "Ese insumo ya está en la receta.",
      },
    ]);
  });

  it("accepts different supplies in the recipe", () => {
    expect(
      schema.safeParse({
        ...validProduct,
        recipe: [
          { supplyId: "supply-harina", quantity: "250", unit: "g" },
          { supplyId: "supply-sal", quantity: "5", unit: "g" },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects a supply id that is not in the catalog", () => {
    expect(
      issues({
        ...validProduct,
        recipe: [{ supplyId: "supply-fantasma", quantity: "250", unit: "g" }],
      }),
    ).toEqual([
      {
        path: "recipe.0.supplyId",
        message: "Ese insumo ya no está disponible en tu catálogo.",
      },
    ]);
  });

  it("rejects a packaging id because packaging is not an ingredient", () => {
    expect(
      issues({
        ...validProduct,
        recipe: [{ supplyId: "packaging-caja", quantity: "1", unit: "unidad" }],
      }),
    ).toEqual([
      {
        path: "recipe.0.supplyId",
        message: "Ese insumo ya no está disponible en tu catálogo.",
      },
    ]);
  });

  it("keeps rejecting a supply that was removed after the recipe was saved", () => {
    const savedRecipe = {
      ...validProduct,
      recipe: [
        { supplyId: "supply-harina", quantity: "250", unit: "g" },
        { supplyId: "supply-eliminado", quantity: "10", unit: "g" },
      ],
    };

    // Editing revalidates against the current catalog, not the saved snapshot.
    expect(
      issues(savedRecipe, createProductFormSchema([supplyOptions[0]])),
    ).toEqual([
      {
        path: "recipe.1.supplyId",
        message: "Ese insumo ya no está disponible en tu catálogo.",
      },
    ]);
  });

  it.each([
    ["120", 120],
    ["0", 0],
    ["0012", 12],
    ["", null],
    ["   ", null],
  ])("normalizes the monthly capacity %j to %j", (monthlyCapacity, expected) => {
    const result = schema.safeParse({ ...validProduct, monthlyCapacity });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.monthlyCapacity).toBe(expected);
    }
  });

  it("accepts a numeric monthly capacity", () => {
    expect(schema.safeParse({ ...validProduct, monthlyCapacity: 120 }).success).toBe(
      true,
    );
  });

  it.each(["-5", "abc", "2.5", "1e3", "2147483648"])(
    "rejects the monthly capacity %j with the shared message",
    (monthlyCapacity) => {
      expect(issues({ ...validProduct, monthlyCapacity })).toEqual([
        {
          path: "monthlyCapacity",
          message: "Ingresá un número entero de unidades, 0 o mayor.",
        },
      ]);
    },
  );
});

describe("toRecipeSupplyOptions", () => {
  it("only offers supplies, never packaging", () => {
    expect(
      toRecipeSupplyOptions([
        {
          id: "supply-harina",
          name: "Harina 000",
          kind: "supply",
          purchaseUnit: "kg",
          minimumUnit: "g",
        },
        {
          id: "packaging-caja",
          name: "Caja de 6",
          kind: "packaging",
          purchaseUnit: "caja",
          minimumUnit: "unidad",
        },
        {
          id: "supply-sal",
          name: "Sal",
          kind: "supply",
          purchaseUnit: "kg",
          minimumUnit: "g",
        },
      ]),
    ).toEqual([
      {
        id: "supply-harina",
        name: "Harina 000",
        family: "mass",
        defaultUnit: "g",
        minimumUnit: "g",
      },
      { id: "supply-sal", name: "Sal", family: "mass", defaultUnit: "g", minimumUnit: "g" },
    ]);
  });

  it("treats a catalog with only packaging as an empty ingredient catalog", () => {
    expect(
      toRecipeSupplyOptions([
        {
          id: "packaging-caja",
          name: "Caja de 6",
          kind: "packaging",
          purchaseUnit: "caja",
          minimumUnit: "unidad",
        },
      ]),
    ).toEqual([]);
  });

  it("keeps a legacy minimum unit and leaves its family unknown", () => {
    expect(
      toRecipeSupplyOptions([
        {
          id: "supply-legacy",
          name: "Harina",
          kind: "supply",
          purchaseUnit: "bolsa",
          minimumUnit: "bolsa",
        },
      ]),
    ).toEqual([
      {
        id: "supply-legacy",
        name: "Harina",
        family: null,
        defaultUnit: "bolsa",
        minimumUnit: "bolsa",
      },
    ]);
  });

  it("infers the family from the minimum unit when the purchase unit is legacy", () => {
    expect(
      toRecipeSupplyOptions([
        {
          id: "supply-legacy",
          name: "Harina",
          kind: "supply",
          purchaseUnit: "bolsa",
          minimumUnit: "g",
        },
      ]),
    ).toEqual([
      {
        id: "supply-legacy",
        name: "Harina",
        family: "mass",
        defaultUnit: "g",
        minimumUnit: "g",
      },
    ]);
  });
});
