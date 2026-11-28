import { expect, test } from "../fixtures";

// Tender drafts (N-31): several can be saved, each is listed with its own
// number and the emprendedor chooses which one to continue and discard.
test("se guardan varios borradores y se continúa y descarta el elegido", async ({ authedPage }) => {
  // Arrange: two catalog supplies and no supplier.
  for (const [name, price] of [
    ["Harina 000", "18750"],
    ["Azúcar", "1000"],
  ]) {
    await authedPage.goto("/supplies");
    await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
    await authedPage.getByLabel("Nombre del insumo").fill(name);
    await authedPage.getByRole("textbox", { name: "Precio de compra" }).fill(price);
    await authedPage.getByRole("combobox", { name: "Unidad de medida" }).selectOption("kg");
    await authedPage.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(authedPage.getByRole("cell", { name, exact: true })).toBeVisible();
  }

  // First draft: Harina, 1 h per round, 3 rounds and 5%.
  await authedPage.goto("/licitaciones/nueva");
  await expect(authedPage.getByRole("button", { name: "Publicar licitación" })).toBeDisabled();
  await expect(
    authedPage.getByText("Para publicar necesitás al menos un proveedor registrado con vos."),
  ).toBeVisible();
  await authedPage.getByLabel("Duración de licitación").fill("1");
  await authedPage.getByLabel("Cantidad de rondas").fill("3");
  await authedPage.getByLabel("% de baja por ronda").fill("5");
  await authedPage.getByRole("checkbox", { name: /Harina 000/ }).check();
  await authedPage.getByLabel("Cantidad (kg)").fill("40");
  await authedPage.getByLabel("Precio de partida por kg").fill("700");
  await authedPage.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(authedPage.getByText("Borrador guardado.", { exact: false })).toBeVisible();

  // Second draft: a fresh form with Azúcar, 2 h per round, 4 rounds and 8%.
  await authedPage.goto("/licitaciones/nueva");
  await authedPage.getByLabel("Duración de licitación").fill("2");
  await authedPage.getByLabel("Cantidad de rondas").fill("4");
  await authedPage.getByLabel("% de baja por ronda").fill("8");
  await authedPage.getByRole("checkbox", { name: /Azúcar/ }).check();
  await authedPage.getByLabel("Cantidad (kg)").fill("15");
  await authedPage.getByLabel("Precio de partida por kg").fill("900");
  await authedPage.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(authedPage.getByText("Borrador guardado.", { exact: false })).toBeVisible();

  // Assert: both drafts are listed and each link opens its own values.
  await authedPage.goto("/licitaciones");
  await expect(authedPage.getByRole("heading", { name: "Borradores" })).toBeVisible();
  await expect(authedPage.getByRole("link", { name: "Continuar borrador N° 1" })).toBeVisible();
  const secondDraft = authedPage.getByRole("link", { name: "Continuar borrador N° 2" });
  await secondDraft.click();
  await expect(authedPage).toHaveURL(/\/licitaciones\/nueva\?borrador=/);
  await expect(authedPage.getByLabel("Duración de licitación")).toHaveValue("2");
  await expect(authedPage.getByLabel("Cantidad de rondas")).toHaveValue("4");
  await expect(authedPage.getByLabel("% de baja por ronda")).toHaveValue("8");
  await expect(authedPage.getByRole("checkbox", { name: /Azúcar/ })).toBeChecked();
  await expect(authedPage.getByRole("checkbox", { name: /Harina 000/ })).not.toBeChecked();
  await expect(authedPage.getByLabel("Cantidad (kg)")).toHaveValue("15");
  await expect(authedPage.getByLabel("Precio de partida por kg")).toHaveValue("900");

  // Saving again updates this draft; it does not create a third one.
  await authedPage.getByLabel("Cantidad (kg)").fill("20");
  await authedPage.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(authedPage.getByText("Borrador guardado.", { exact: false })).toBeVisible();
  await authedPage.goto("/licitaciones");
  await expect(authedPage.getByRole("link", { name: /Continuar borrador N°/ })).toHaveCount(2);

  // Discarding only removes the chosen draft, and the other one survives.
  await secondDraft.click();
  await expect(authedPage.getByLabel("Cantidad (kg)")).toHaveValue("20");
  await authedPage.getByRole("button", { name: "Descartar borrador" }).click();
  await expect(authedPage).toHaveURL("/licitaciones");
  await expect(authedPage.getByRole("link", { name: "Continuar borrador N° 2" })).toHaveCount(0);
  await authedPage.getByRole("link", { name: "Continuar borrador N° 1" }).click();
  await expect(authedPage.getByLabel("Duración de licitación")).toHaveValue("1");
  await expect(authedPage.getByLabel("Cantidad de rondas")).toHaveValue("3");
  await expect(authedPage.getByLabel("% de baja por ronda")).toHaveValue("5");
  await expect(authedPage.getByRole("checkbox", { name: /Harina 000/ })).toBeChecked();
  await expect(authedPage.getByLabel("Cantidad (kg)")).toHaveValue("40");
});
