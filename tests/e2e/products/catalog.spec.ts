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
  await expect(
    authedPage.getByRole("cell", { name: "Sal fina", exact: true }),
  ).toBeVisible();

  async function createProduct(name: string, supply: string) {
    await authedPage.goto("/products");
    await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
    const dialog = authedPage.getByRole("dialog", { name: "Nuevo producto" });
    await dialog.getByLabel("Nombre del producto").fill(name);
    await dialog.getByLabel("Insumo").selectOption({ label: supply });
    await dialog.getByLabel("Cantidad").fill("100");
    await dialog.getByLabel("Unidad", { exact: true }).selectOption("g");
    await dialog.getByLabel(/obtenés con esta receta/i).fill("12");
    await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(
      authedPage.getByRole("status").filter({
        hasText: "Producto guardado en tu catálogo.",
      }),
    ).toBeVisible();
  }

  await createProduct("Pan flauta", "Harina 000");
  await createProduct("Pizza rústica", "Sal fina");

  // Búsqueda por nombre de producto, sin distinguir mayúsculas.
  await authedPage.goto("/products");
  const search = authedPage.getByLabel("Buscar");
  await search.fill("pan");
  await expect(
    authedPage.getByRole("cell", { name: "Pan flauta", exact: true }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("cell", { name: "Pizza rústica", exact: true }),
  ).toHaveCount(0);
  await expect(
    authedPage.getByRole("heading", { name: "Productos (1)" }),
  ).toBeVisible();

  // Búsqueda sin acentos sobre un nombre con tilde.
  await search.fill("rustica");
  await expect(
    authedPage.getByRole("cell", { name: "Pizza rústica", exact: true }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("cell", { name: "Pan flauta", exact: true }),
  ).toHaveCount(0);

  // Búsqueda por insumo de la receta.
  await search.fill("sal");
  await expect(
    authedPage.getByRole("cell", { name: "Pizza rústica", exact: true }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("cell", { name: "Pan flauta", exact: true }),
  ).toHaveCount(0);

  // Sin resultados.
  await search.fill("zzzz");
  await expect(
    authedPage.getByText("No encontramos productos con esa búsqueda."),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("heading", { name: "Productos (0)" }),
  ).toBeVisible();
});

test("edita y borra un producto desde las acciones de la fila", async ({
  authedPage,
}) => {
  // Arrange: un insumo y un producto con receta.
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
  const created = authedPage.getByRole("dialog", { name: "Nuevo producto" });
  await created.getByLabel("Nombre del producto").fill("Pan flauta");
  await created.getByLabel("Insumo").selectOption({ label: "Harina 000" });
  await created.getByLabel("Cantidad").fill("100");
  await created.getByLabel("Unidad", { exact: true }).selectOption("g");
  await created.getByLabel(/obtenés con esta receta/i).fill("12");
  await created.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    authedPage.getByRole("status").filter({
      hasText: "Producto guardado en tu catálogo.",
    }),
  ).toBeVisible();

  // Editar desde la fila: el modal abre con los datos y reemplaza la fila.
  await authedPage.getByRole("button", { name: "Editar Pan flauta" }).click();
  const edit = authedPage.getByRole("dialog", { name: "Editar producto" });
  await expect(edit.getByLabel("Nombre del producto")).toHaveValue(
    "Pan flauta",
  );
  await edit.getByLabel("Nombre del producto").fill("Pan de campo");
  await edit.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(edit).toHaveCount(0);
  await expect(
    authedPage.getByRole("status").filter({ hasText: "Producto actualizado." }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("cell", { name: "Pan de campo", exact: true }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("cell", { name: "Pan flauta", exact: true }),
  ).toHaveCount(0);

  // "Editar receta" desde el detalle pasa al formulario de edición.
  await authedPage
    .getByRole("button", { name: "Ver receta de Pan de campo" })
    .click();
  await authedPage.getByRole("button", { name: "Editar receta" }).click();
  const editFromDetail = authedPage.getByRole("dialog", {
    name: "Editar producto",
  });
  await expect(editFromDetail).toBeVisible();
  await expect(
    editFromDetail.getByLabel("Nombre del producto"),
  ).toHaveValue("Pan de campo");
  await editFromDetail.getByRole("button", { name: "Cancelar" }).click();
  await expect(authedPage.getByRole("dialog")).toHaveCount(0);

  // Borrar desde la fila: confirma, avisa y vuelve al estado vacío.
  authedPage.once("dialog", (confirmDialog) => confirmDialog.accept());
  await authedPage.getByRole("button", { name: "Borrar Pan de campo" }).click();
  await expect(
    authedPage.getByRole("status").filter({ hasText: "se borró del catálogo" }),
  ).toBeVisible();
  await expect(
    authedPage.getByText("Todavía no cargaste ningún producto."),
  ).toBeVisible();
});
