import { expect, test } from "../fixtures";

// Issue #269: the monthly capacity is one more product field, editable at any
// time, saved with the product and shown in the catalog.
test("guarda, edita y muestra la capacidad mensual del producto", async ({
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
  const dialog = authedPage.getByRole("dialog", { name: "Nuevo producto" });
  const capacity = dialog.getByLabel(
    "¿Cuántas unidades pensás fabricar este mes?",
  );

  await dialog.getByLabel("Nombre del producto").fill("Pan flauta");
  await dialog.getByLabel("Insumo").selectOption({ label: "Harina 000" });
  await dialog.getByLabel("Cantidad").fill("250");
  await dialog.getByLabel("Unidad").selectOption("g");

  // The warning is live: it shows while the capacity is empty and disappears
  // as soon as a positive value is typed, before saving.
  await expect(
    dialog.getByText(
      "Sin capacidad mensual este producto no entra en el reparto de gastos ni muestra precio sugerido.",
    ),
  ).toBeVisible();
  await capacity.fill("120");
  await expect(
    dialog.getByText(
      "Sin capacidad mensual este producto no entra en el reparto de gastos ni muestra precio sugerido.",
    ),
  ).toHaveCount(0);

  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    authedPage.getByRole("status").filter({
      hasText: "Producto guardado en tu catálogo.",
    }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("cell", { name: "120", exact: true }),
  ).toBeVisible();

  // Editing the capacity persists the change.
  await authedPage.getByRole("button", { name: "Editar Pan flauta" }).click();
  const edit = authedPage.getByRole("dialog", { name: "Editar producto" });
  await expect(
    edit.getByLabel("¿Cuántas unidades pensás fabricar este mes?"),
  ).toHaveValue("120");
  await edit
    .getByLabel("¿Cuántas unidades pensás fabricar este mes?")
    .fill("200");
  await edit.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    authedPage.getByRole("status").filter({ hasText: "Producto actualizado." }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("cell", { name: "200", exact: true }),
  ).toBeVisible();

  // Clearing it saves NULL and the list says "Sin cargar", never 0.
  await authedPage.getByRole("button", { name: "Editar Pan flauta" }).click();
  const clear = authedPage.getByRole("dialog", { name: "Editar producto" });
  await clear
    .getByLabel("¿Cuántas unidades pensás fabricar este mes?")
    .fill("");
  await expect(
    clear.getByText(
      "Sin capacidad mensual este producto no entra en el reparto de gastos ni muestra precio sugerido.",
    ),
  ).toBeVisible();
  await clear.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    authedPage.getByRole("status").filter({ hasText: "Producto actualizado." }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("cell", { name: "Sin cargar", exact: true }),
  ).toBeVisible();
});
