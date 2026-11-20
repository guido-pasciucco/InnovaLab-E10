import { expect, test } from "../fixtures";

// Issue #265: a recipe line stores quantity + unit, the selector only offers
// units from the supply's family, and the saved recipe shows the unit.
test("guarda la unidad de una línea de receta y la muestra", async ({
  authedPage,
}) => {
  await authedPage.goto("/insumos");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  await authedPage.getByLabel("Nombre del insumo").fill("Harina 000");
  await authedPage
    .getByRole("textbox", { name: "Precio de compra" })
    .fill("18750");
  await authedPage
    .getByRole("combobox", { name: "Unidad de medida" })
    .selectOption("kg");
  await authedPage.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    authedPage.getByRole("cell", { name: "Harina 000", exact: true }),
  ).toBeVisible();

  await authedPage.goto("/products");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  await authedPage.getByLabel("Nombre del producto").fill("Pan flauta");
  await authedPage.getByLabel("Insumo").selectOption({ label: "Harina 000" });
  await authedPage.getByLabel("Cantidad").fill("250");
  await authedPage.getByLabel("Unidad").selectOption("kg");
  await authedPage.getByLabel(/unidades/i).fill("1");
  await authedPage.getByRole("button", { name: "Guardar", exact: true }).click();

  await expect(
    authedPage.getByRole("status").filter({
      hasText: "Producto guardado en tu catálogo.",
    }),
  ).toBeVisible();
  await authedPage
    .getByRole("button", { name: "Ver receta de Pan flauta" })
    .click();

  await expect(
    authedPage.getByRole("heading", { name: "Pan flauta" }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("cell", { name: "250", exact: true }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("cell", { name: "kg", exact: true }),
  ).toBeVisible();
});
