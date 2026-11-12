import { describe, expect, it } from "vitest";

import {
  createProductFormSchema,
  toRecipeSupplyOptions,
} from "./products";

// Messages are defined once in the schema and shown by RHF in the client.
// The server will reuse the same field rules when persistence lands.
const allowedSupplyIds = ["supply-harina", "supply-sal"];
const schema = createProductFormSchema(allowedSupplyIds);

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
  recipe: [{ supplyId: "supply-harina", quantity: "250" }],
};

describe("createProductFormSchema", () => {
  it("accepts a product with a name and one recipe item", () => {
    expect(schema.safeParse(validProduct).success).toBe(true);
  });

  it("accepts decimal quantities with up to three decimals", () => {
    expect(
      schema.safeParse({
        ...validProduct,
        recipe: [{ supplyId: "supply-harina", quantity: "0.001" }],
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
        recipe: [{ supplyId: "", quantity: "250" }],
      }),
    ).toEqual([
      {
        path: "recipe.0.supplyId",
        message: "Elegí un insumo de tu catálogo.",
      },
    ]);
  });

  it.each([
    ["", "Indicá la cantidad del insumo."],
    ["abc", "La cantidad debe ser un número."],
    ["0", "La cantidad debe ser mayor que 0."],
    ["-5", "La cantidad debe ser mayor que 0."],
    ["1.2345", "La cantidad debe tener hasta 3 decimales."],
    ["12345678901", "La cantidad es demasiado grande."],
  ])("rejects the quantity %j", (quantity, message) => {
    expect(
      issues({
        ...validProduct,
        recipe: [{ supplyId: "supply-harina", quantity }],
      }),
    ).toEqual([{ path: "recipe.0.quantity", message }]);
  });

  it("rejects the same supply twice in the recipe", () => {
    expect(
      issues({
        ...validProduct,
        recipe: [
          { supplyId: "supply-harina", quantity: "250" },
          { supplyId: "supply-harina", quantity: "100" },
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
          { supplyId: "supply-harina", quantity: "250" },
          { supplyId: "supply-sal", quantity: "5" },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects a supply id that is not in the catalog", () => {
    expect(
      issues({
        ...validProduct,
        recipe: [{ supplyId: "supply-fantasma", quantity: "250" }],
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
        recipe: [{ supplyId: "packaging-caja", quantity: "1" }],
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
        { supplyId: "supply-harina", quantity: "250" },
        { supplyId: "supply-eliminado", quantity: "10" },
      ],
    };

    // Editing revalidates against the current catalog, not the saved snapshot.
    expect(issues(savedRecipe, createProductFormSchema(["supply-harina"]))).toEqual([
      {
        path: "recipe.1.supplyId",
        message: "Ese insumo ya no está disponible en tu catálogo.",
      },
    ]);
  });
});

describe("toRecipeSupplyOptions", () => {
  it("only offers supplies, never packaging", () => {
    expect(
      toRecipeSupplyOptions([
        { id: "supply-harina", name: "Harina 000", kind: "supply" },
        { id: "packaging-caja", name: "Caja de 6", kind: "packaging" },
        { id: "supply-sal", name: "Sal", kind: "supply" },
      ]),
    ).toEqual([
      { id: "supply-harina", name: "Harina 000" },
      { id: "supply-sal", name: "Sal" },
    ]);
  });

  it("treats a catalog with only packaging as an empty ingredient catalog", () => {
    expect(
      toRecipeSupplyOptions([
        { id: "packaging-caja", name: "Caja de 6", kind: "packaging" },
      ]),
    ).toEqual([]);
  });
});
