import { expect, test } from "../fixtures";

test("el sidebar del flujo 1 navega entre insumos y productos", async ({ authedPage }) => {
  await authedPage.goto("/insumos");
  const sidebar = authedPage.getByRole("navigation", { name: "Principal" });

  await sidebar.getByRole("link", { name: "Productos" }).click();
  await expect(authedPage).toHaveURL("/products");
  await expect(authedPage.getByRole("heading", { name: "Productos", level: 1 })).toBeVisible();

  await sidebar.getByRole("link", { name: "Insumos" }).click();
  await expect(authedPage).toHaveURL("/insumos");
});

test("el formulario de insumo usa la unidad de medida del catálogo", async ({ authedPage }) => {
  await authedPage.goto("/insumos");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();

  await expect(authedPage.getByRole("combobox", { name: "Unidad de medida" })).toBeVisible();
  await expect(authedPage.getByRole("combobox", { name: "Unidad de compra" })).toHaveCount(0);
});
