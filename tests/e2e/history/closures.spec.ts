import { expect, test } from "../fixtures";
import { PeriodCostsPage } from "../pages/period-costs.page";

// Issue #322: close a month, change an input price, close it again and read
// both versions with their audit. The example numbers are the ones in the issue.
async function arrangeCatalog(authedPage: import("@playwright/test").Page) {
  await authedPage.goto("/supplies");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  await authedPage.getByLabel("Nombre del insumo").fill("Harina");
  await authedPage.getByRole("textbox", { name: "Precio de compra" }).fill("1000");
  await authedPage.getByRole("combobox", { name: "Unidad de medida" }).selectOption("kg");
  await authedPage.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(authedPage.getByRole("cell", { name: "Harina", exact: true })).toBeVisible();

  await authedPage.goto("/products");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  const dialog = authedPage.getByRole("dialog", { name: "Nuevo producto" });
  await dialog.getByLabel("Nombre del producto").fill("Alfajor");
  await dialog.getByLabel("Insumo").selectOption({ label: "Harina" });
  await dialog.getByLabel("Cantidad").fill("1");
  await dialog.getByLabel("Unidad", { exact: true }).selectOption("kg");
  await dialog.getByLabel(/obtenés con esta receta/i).fill("10");
  await dialog.getByLabel("¿Cuántas unidades pensás fabricar este mes?").fill("150");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(authedPage.getByRole("cell", { name: "Alfajor", exact: true })).toBeVisible();

  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();
  await periodCosts.addLine("Alquiler", "30000");

  await authedPage.goto("/precios");
  await authedPage.getByLabel("Recargo por defecto del negocio").fill("50");
  await authedPage.getByRole("button", { name: "Guardar recargo por defecto" }).click();
}

async function closeMonth(authedPage: import("@playwright/test").Page) {
  await authedPage.getByRole("button", { name: /Cerrar el cálculo de/ }).click();
  const dialog = authedPage.getByRole("dialog", { name: "Cerrar cálculo" });
  await expect(dialog).toContainText("se guarda una versión nueva");
  await dialog.getByRole("button", { name: "Confirmar cierre" }).click();
  await expect(authedPage.getByText(/Último cierre:/)).toBeVisible();
}

test("a user without closures is invited to close a month", async ({ authedPage }) => {
  await authedPage.goto("/historico");

  await expect(authedPage.getByRole("heading", { name: "Datos históricos", exact: true })).toBeVisible();
  await expect(authedPage.getByText("Todavía no cerraste ningún mes.")).toBeVisible();
  await expect(authedPage.getByRole("link", { name: "Ir a Equilibrio" })).toBeVisible();
});

test("closing, changing flour and closing again keeps two versions and their audit", async ({
  authedPage,
}) => {
  await arrangeCatalog(authedPage);

  await authedPage.goto("/equilibrio");
  await expect(
    authedPage.getByRole("definition").filter({ hasText: "$ 38.571,43" }),
  ).toBeVisible();
  await closeMonth(authedPage);

  await authedPage.goto("/supplies");
  await authedPage.getByRole("button", { name: "Editar Harina" }).click();
  const supplyDialog = authedPage.getByRole("dialog", { name: "Editar insumo" });
  await supplyDialog.getByRole("textbox", { name: "Precio de compra" }).fill("2000");
  await supplyDialog.getByRole("button", { name: "Guardar", exact: true }).click();

  await authedPage.goto("/equilibrio");
  await expect(
    authedPage.getByRole("definition").filter({ hasText: "$ 45.000,00" }),
  ).toBeVisible();
  await closeMonth(authedPage);

  await authedPage.goto("/historico");
  const monthLink = authedPage.getByRole("link", { name: /noviembre de \d{4}/ });
  await expect(monthLink).toBeVisible();
  await monthLink.click();

  await expect(authedPage.getByRole("link", { name: /Versión 1/ })).toBeVisible();
  await expect(authedPage.getByRole("link", { name: /Versión 2/ })).toBeVisible();

  const changes = authedPage.getByRole("table", { name: /Diferencias entre la versión elegida/ });
  await expect(changes.getByRole("row", { name: /Harina · precio/ })).toContainText("$ 1.000,00");
  await expect(changes.getByRole("row", { name: /Harina · precio/ })).toContainText("$ 2.000,00");
  await expect(changes.getByRole("row", { name: /Alfajor · precio/ })).toContainText("$ 450,00");
  await expect(changes.getByRole("row", { name: /Alfajor · precio/ })).toContainText("$ 600,00");
  await expect(changes.getByRole("row", { name: /Ventas de equilibrio/ })).toContainText(
    "$ 38.571,43",
  );
  await expect(changes.getByRole("row", { name: /Ventas de equilibrio/ })).toContainText(
    "$ 45.000,00",
  );

  await authedPage.getByRole("link", { name: /Versión 1/ }).click();
  const frozenPrices = authedPage.getByRole("table", {
    name: "Costo total, recargo, precio sugerido, ganancia y margen real guardados en la foto",
  });
  await expect(frozenPrices.getByRole("row", { name: /Alfajor/ })).toContainText("$ 450,00");
});
