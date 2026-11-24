import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../fixtures";

// #288 QA: the visual adaptation must keep one column on mobile, aligned
// inputs on desktop, and must never present an unsaved edit as a recalculated
// cost. The engine still runs only on the server, on save.
async function createSupply(page: Page, name: string, price: string) {
  await page.goto("/supplies");
  await page.getByRole("button", { name: "+ Nuevo" }).click();
  await page.getByLabel("Nombre del insumo").fill(name);
  await page.getByRole("textbox", { name: "Precio de compra" }).fill(price);
  await page
    .getByRole("combobox", { name: "Unidad de medida" })
    .selectOption("kg");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
}

async function fillRow(dialog: Locator, index: number, supply: string, quantity: string) {
  await dialog.getByLabel("Insumo").nth(index).selectOption({ label: supply });
  await dialog.getByLabel("Cantidad").nth(index).fill(quantity);
  await dialog.getByLabel("Unidad", { exact: true }).nth(index).selectOption("g");
}

async function savedUnitCost(page: Page): Promise<string> {
  const result = page.getByRole("region", { name: "Costo variable calculado" });
  return ((await result.locator("p.text-2xl").textContent()) ?? "").trim();
}

test("el formulario es responsive, alinea los campos y no anticipa el costo recalculado", async ({
  authedPage,
}) => {
  await authedPage.setViewportSize({ width: 1440, height: 1400 });
  await createSupply(authedPage, "Harina 000", "18750");
  await createSupply(authedPage, "Aceite", "2800");
  await createSupply(authedPage, "Dulce de leche", "4100");

  await authedPage.goto("/products");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  let dialog = authedPage.getByRole("dialog", { name: "Nuevo producto" });

  // Desktop: the longer capacity label must not push its input down.
  const nameBox = (await dialog.getByLabel("Nombre del producto").boundingBox())!;
  const capacityBox = (
    await dialog
      .getByLabel("¿Cuántas unidades pensás fabricar este mes?")
      .boundingBox()
  )!;
  expect(Math.abs(nameBox.y - capacityBox.y)).toBeLessThan(2);

  // Incomplete form: errors are shown and nothing is saved.
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog.getByText("Escribí el nombre de tu producto.")).toBeVisible();
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Nombre del producto").fill("Alfajores");
  await fillRow(dialog, 0, "Harina 000", "250");
  await dialog.getByRole("button", { name: "+ Agregar insumo" }).click();
  await fillRow(dialog, 1, "Aceite", "120");
  await dialog.getByRole("button", { name: "+ Agregar insumo" }).click();
  await fillRow(dialog, 2, "Dulce de leche", "300");
  await dialog.getByLabel(/obtenés con esta receta/i).fill("12");
  await dialog
    .getByLabel("¿Cuántas unidades pensás fabricar este mes?")
    .fill("300");

  // Mobile: one column, the modal scrolls and both actions remain reachable.
  await authedPage.setViewportSize({ width: 390, height: 844 });
  const mName = (await dialog.getByLabel("Nombre del producto").boundingBox())!;
  const mCapacity = (
    await dialog
      .getByLabel("¿Cuántas unidades pensás fabricar este mes?")
      .boundingBox()
  )!;
  expect(Math.abs(mName.x - mCapacity.x)).toBeLessThan(2);
  expect(mCapacity.y).toBeGreaterThan(mName.y + mName.height);
  await dialog.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    dialog.getByRole("button", { name: "Guardar", exact: true }),
  ).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeInViewport();

  await authedPage.setViewportSize({ width: 1440, height: 1100 });
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    authedPage
      .getByRole("status")
      .filter({ hasText: "Producto guardado en tu catálogo." }),
  ).toBeVisible();

  await authedPage
    .getByRole("button", { name: "Ver receta de Alfajores" })
    .click();
  const detail = authedPage.getByRole("dialog", { name: "Alfajores" });
  const savedAmount = await savedUnitCost(authedPage);
  expect(savedAmount).not.toBe("");
  await authedPage.keyboard.press("Escape");
  await expect(detail).toHaveCount(0);

  // Editing an ingredient keeps the old amount, explicitly marked as saved.
  await authedPage.getByRole("button", { name: "Editar Alfajores" }).click();
  dialog = authedPage.getByRole("dialog", { name: "Editar producto" });
  await dialog.getByLabel("Cantidad").first().fill("500");
  const result = authedPage.getByRole("region", {
    name: "Costo variable calculado",
  });
  await expect(result).toContainText("Último resultado guardado");
  await expect(result).toContainText("Cambios sin guardar");
  expect(await savedUnitCost(authedPage)).toBe(savedAmount);

  // Only after saving does the detail show the recalculated amount.
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    authedPage
      .getByRole("status")
      .filter({ hasText: "Producto actualizado." }),
  ).toBeVisible();
  await authedPage
    .getByRole("button", { name: "Ver receta de Alfajores" })
    .click();
  expect(await savedUnitCost(authedPage)).not.toBe(savedAmount);
});
