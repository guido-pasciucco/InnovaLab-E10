import { expect, test } from "../fixtures";

// #288 QA: CatalogModal and FormGrid are shared. The packaging form must keep
// its focus behaviour and its two-column grid after the visual changes.
test("el modal compartido funciona en Packaging", async ({ authedPage }) => {
  await authedPage.goto("/supplies");
  await authedPage.getByRole("tab", { name: /Packaging/ }).click();
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();

  const dialog = authedPage.getByRole("dialog", { name: "Nuevo packaging" });
  await expect(dialog).toBeVisible();
  await expect(authedPage.getByLabel("Nombre del packaging")).toBeFocused();

  const trigger = authedPage.getByRole("button", { name: "+ Nuevo" });
  await authedPage.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  const reopened = authedPage.getByRole("dialog", { name: "Nuevo packaging" });
  await reopened.getByLabel("Nombre del packaging").fill("Bolsa kraft 1 kg");
  await reopened.getByRole("textbox", { name: "Precio de compra" }).fill("1500");
  await reopened
    .getByRole("combobox", { name: "Unidad de medida" })
    .selectOption("unidad");
  await reopened.getByRole("button", { name: "Guardar", exact: true }).click();

  await expect(
    authedPage.getByRole("cell", { name: "Bolsa kraft 1 kg", exact: true }),
  ).toBeVisible();
});
