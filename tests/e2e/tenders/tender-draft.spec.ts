import { expect, test } from "../fixtures";

// Tender drafts: an emprendedor loads the supplies to publish, saves the
// draft, and finds it again from the tender list. No supplier selection is
// needed any more (#309).
test("se cargan los insumos, se guarda el borrador y se retoma", async ({ authedPage }) => {
  // Arrange: one catalog supply.
  await authedPage.goto("/supplies");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  await authedPage.getByLabel("Nombre del insumo").fill("Harina 000");
  await authedPage.getByRole("textbox", { name: "Precio de compra" }).fill("18750");
  await authedPage.getByRole("combobox", { name: "Unidad de medida" }).selectOption("kg");
  await authedPage.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(authedPage.getByRole("cell", { name: "Harina 000", exact: true })).toBeVisible();

  // Act: the form is available and no supplier selection is shown.
  await authedPage.goto("/licitaciones/nueva");
  await expect(authedPage.getByRole("heading", { name: "Proveedores invitados" })).toHaveCount(0);

  await authedPage.getByLabel("Cantidad de rondas").selectOption("4");
  await authedPage.getByLabel("% de baja por ronda").fill("5");
  await authedPage.getByRole("checkbox", { name: /Harina 000/ }).check();
  await authedPage.getByLabel("Cantidad (kg)").fill("40");
  await authedPage.getByLabel("Precio de partida por kg").fill("700");
  await authedPage.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(authedPage.getByText("Borrador guardado.", { exact: false })).toBeVisible();

  // Assert: the list offers to continue, and the form reopens with the values.
  await authedPage.goto("/licitaciones");
  await authedPage.getByRole("link", { name: "Seguir con el borrador" }).click();
  await expect(authedPage).toHaveURL("/licitaciones/nueva");
  await expect(authedPage.getByLabel("Cantidad de rondas")).toHaveValue("4");
  await expect(authedPage.getByLabel("% de baja por ronda")).toHaveValue("5");
  await expect(authedPage.getByRole("checkbox", { name: /Harina 000/ })).toBeChecked();
  await expect(authedPage.getByLabel("Cantidad (kg)")).toHaveValue("40");
  await expect(authedPage.getByLabel("Precio de partida por kg")).toHaveValue("700");

  // Discarding goes back to the list, without the draft.
  await authedPage.getByRole("button", { name: "Descartar borrador" }).click();
  await expect(authedPage).toHaveURL("/licitaciones");
  await expect(authedPage.getByRole("link", { name: "Nueva licitación" })).toBeVisible();
});
