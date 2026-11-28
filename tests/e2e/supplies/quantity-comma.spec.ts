import { expect, test } from "../fixtures";

// A comma is the decimal separator in Spanish. The quantity field used to
// reject it, and the live unit-cost preview disappeared because it read the
// raw text. Typing "1,5" must keep the preview and save 1.5.
test("guarda una cantidad comprada escrita con coma", async ({ authedPage }) => {
  await authedPage.goto("/supplies");

  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  const dialog = authedPage.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByRole("textbox", { name: "Nombre del insumo" }).fill("Azúcar");
  await dialog.getByRole("textbox", { name: "Precio de compra" }).fill("1500");
  await dialog.getByRole("textbox", { name: "Cantidad comprada" }).fill("1,5");
  await dialog.getByRole("combobox", { name: "Unidad de medida" }).selectOption("kg");

  await expect(dialog.getByText("Costo por g:")).toBeVisible();

  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toHaveCount(0);

  const row = authedPage.getByRole("row").filter({ hasText: "Azúcar" });
  await expect(row).toContainText("1,5 kg");
});
