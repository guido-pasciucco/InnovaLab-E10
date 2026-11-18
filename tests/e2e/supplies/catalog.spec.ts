import { expect, test } from "../fixtures";

test("el dashboard lleva al catálogo de insumos", async ({ authedPage }) => {
  await authedPage.goto("/dashboard");

  await authedPage.getByRole("link", { name: "Gestionar insumos" }).click();

  await expect(authedPage).toHaveURL("/insumos");
  await expect(
    authedPage.getByRole("heading", { name: "Insumos y packaging" }),
  ).toBeVisible();
});

test("la ruta anterior /supplies redirige al catálogo en /insumos", async ({ authedPage }) => {
  await authedPage.goto("/supplies");

  await expect(authedPage).toHaveURL("/insumos");
});

test("el formulario de insumo usa la unidad de medida del catálogo", async ({ authedPage }) => {
  await authedPage.goto("/insumos");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();

  await expect(authedPage.getByRole("combobox", { name: "Unidad de medida" })).toBeVisible();
  await expect(authedPage.getByRole("combobox", { name: "Unidad de compra" })).toHaveCount(0);
});
