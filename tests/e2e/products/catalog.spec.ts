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

test("busca productos por nombre y por insumo de la receta", async ({
  authedPage,
}) => {
  // Arrange: un insumo y dos productos con recetas distintas.
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

  await authedPage.goto("/insumos");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  await authedPage.getByLabel("Nombre del insumo").fill("Sal fina");
  await authedPage
    .getByRole("textbox", { name: "Precio de compra" })
    .fill("1000");
  await authedPage
    .getByRole("combobox", { name: "Unidad de medida" })
    .selectOption("kg");
  await authedPage.getByRole("button", { name: "Guardar", exact: true }).click();

  async function createProduct(name: string, supply: string) {
    await authedPage.goto("/products");
    await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
    const dialog = authedPage.getByRole("dialog", { name: "Nuevo producto" });
    await dialog.getByLabel("Nombre del producto").fill(name);
    await dialog.getByLabel("Insumo").selectOption({ label: supply });
    await dialog.getByLabel("Cantidad").fill("100");
    await dialog.getByLabel("Unidad").selectOption("g");
    await dialog.getByRole("button", { name: "Guardar producto" }).click();
    await expect(
      authedPage.getByRole("status").filter({ hasText: "quedaron guardados" }),
    ).toBeVisible();
  }

  await createProduct("Pan flauta", "Harina 000");
  await createProduct("Pizza", "Sal fina");

  // Búsqueda por nombre de producto (sin acentos).
  await authedPage.goto("/products");
  const search = authedPage.getByLabel("Buscar");
  await search.fill("pan");
  await expect(
    authedPage.getByRole("cell", { name: "Pan flauta", exact: true }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("cell", { name: "Pizza", exact: true }),
  ).toHaveCount(0);

  // Búsqueda por insumo de la receta.
  await search.fill("sal");
  await expect(
    authedPage.getByRole("cell", { name: "Pizza", exact: true }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("cell", { name: "Pan flauta", exact: true }),
  ).toHaveCount(0);

  // Sin resultados.
  await search.fill("zzzz");
  await expect(
    authedPage.getByText("No encontramos productos con esa búsqueda."),
  ).toBeVisible();
});
