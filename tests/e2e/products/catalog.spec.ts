import { expect, test } from "../fixtures";

test("el catálogo de productos comparte el patrón de insumos", async ({
  authedPage,
}) => {
  await authedPage.goto("/products");

  await expect(
    authedPage.getByRole("heading", { name: /^Productos \(/ }),
  ).toBeVisible();
  await expect(
    authedPage.getByLabel("Buscar", { exact: true }),
  ).toHaveCount(0);
  await expect(
    authedPage.getByText("Todavía no cargaste ningún producto."),
  ).toBeVisible();

  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();

  const dialog = authedPage.getByRole("dialog", { name: "Nuevo producto" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByLabel("Nombre del producto"),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toHaveCount(0);
});
