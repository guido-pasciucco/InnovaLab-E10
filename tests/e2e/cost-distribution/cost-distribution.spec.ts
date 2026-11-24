import { expect, test } from "../fixtures";
import { PeriodCostsPage } from "../pages/period-costs.page";

// Issue #244: the screen that shows which part of the month's expenses each
// product absorbs and the total cost of one unit. The figures are derived from
// the saved capacity and expenses, so they survive a reload.

test("a user without products is invited to create one", async ({ authedPage }) => {
  await authedPage.goto("/total-costs");

  await expect(
    authedPage.getByRole("heading", { name: "Costo total por producto", exact: true }),
  ).toBeVisible();
  await expect(authedPage.getByText("Todavía no cargaste ningún producto.")).toBeVisible();
  await expect(authedPage.getByText("Falta la capacidad mensual")).toBeVisible();
});

test("shows the total cost of a product from its capacity and the period expenses", async ({
  authedPage,
}) => {
  await authedPage.goto("/supplies");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  await authedPage.getByLabel("Nombre del insumo").fill("Harina 000");
  await authedPage.getByRole("textbox", { name: "Precio de compra" }).fill("18750");
  await authedPage.getByRole("combobox", { name: "Unidad de medida" }).selectOption("kg");
  await authedPage.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(authedPage.getByRole("cell", { name: "Harina 000", exact: true })).toBeVisible();

  await authedPage.goto("/products");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  const dialog = authedPage.getByRole("dialog", { name: "Nuevo producto" });
  await dialog.getByLabel("Nombre del producto").fill("Pan flauta");
  await dialog.getByLabel("Insumo").selectOption({ label: "Harina 000" });
  await dialog.getByLabel("Cantidad").fill("250");
  await dialog.getByLabel("Unidad", { exact: true }).selectOption("g");
  await dialog.getByLabel(/obtenés con esta receta/i).fill("12");
  await dialog.getByLabel("¿Cuántas unidades pensás fabricar este mes?").fill("120");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(authedPage.getByRole("cell", { name: "Pan flauta", exact: true })).toBeVisible();

  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();
  await periodCosts.addLine("Alquiler", "120000");

  await authedPage.goto("/total-costs");

  const row = authedPage.getByRole("row", { name: /Pan flauta/ });
  // 120.000 / 120 u. = 1.000 per unit. The supply form is filled without a
  // quantity, so it is 1 kg for $18.750 and the variable cost is
  // 250 g * 18,75 / 12 = 390,63.
  await expect(row).toContainText("100 %");
  await expect(row).toContainText("$ 120.000,00");
  await expect(row).toContainText("$ 1.000,00");
  await expect(row).toContainText("$ 1.390,63");

  await authedPage.reload();
  await expect(authedPage.getByRole("row", { name: /Pan flauta/ })).toContainText("$ 1.390,63");

  await authedPage.getByText("¿Cómo se distribuyó?").click();
  await expect(authedPage.getByText("Suma de capacidades")).toBeVisible();
});
