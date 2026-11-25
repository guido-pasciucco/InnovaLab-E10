import { expect, test } from "../fixtures";
import { PeriodCostsPage } from "../pages/period-costs.page";

// Issue #246: the break-even view reads the live catalog through the pricing
// service (#312) and shows the summary, the quota per product, the closing
// check and the chart (#247). Nothing is stored.

async function arrangeCatalog(authedPage: import("@playwright/test").Page) {
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
}

test("a user without products is sent to load them", async ({ authedPage }) => {
  await authedPage.goto("/equilibrio");

  await expect(authedPage.getByRole("heading", { name: "Punto de equilibrio", level: 1 })).toBeVisible();
  await expect(authedPage.getByText("Todavía no cargaste productos")).toBeVisible();
  await expect(authedPage.getByRole("link", { name: "Ir a productos" })).toHaveAttribute(
    "href",
    "/products",
  );
});

test("asks for a markup in Precios while the products have no price", async ({ authedPage }) => {
  await arrangeCatalog(authedPage);
  await authedPage.goto("/equilibrio");

  const banner = authedPage.getByRole("region", { name: "Faltan los precios" });
  await expect(banner.getByRole("link", { name: "Ir a precios" })).toHaveAttribute("href", "/precios");

  const excluded = authedPage.getByRole("region", { name: "Productos a revisar" });
  await expect(excluded).toContainText("Pan flauta: Sin precio: cargale un recargo.");
  await expect(excluded.getByRole("link", { name: "Ir a precios" })).toHaveAttribute("href", "/precios");
  await expect(authedPage.getByRole("heading", { name: "Punto de equilibrio", level: 3 })).toHaveCount(0);
});

test("shows the break-even, the closing check and the chart with markups loaded", async ({
  authedPage,
}) => {
  await arrangeCatalog(authedPage);
  await authedPage.goto("/precios");
  await authedPage.getByLabel("Recargo por defecto del negocio").fill("30");
  await authedPage.getByRole("button", { name: "Guardar recargo por defecto" }).click();
  await expect(authedPage.getByRole("status")).toContainText("Recargo guardado.");

  await authedPage.getByRole("link", { name: "Equilibrio" }).click();
  await expect(authedPage).toHaveURL(/\/equilibrio$/);

  const summary = authedPage.getByRole("region", { name: "Resumen del mes" });
  await expect(summary).toContainText("$ 120.000,00");
  await expect(summary).toContainText("unidades");

  const row = authedPage.getByRole("row", { name: /Pan flauta/ });
  await expect(row).toContainText("$ 1.807,82");
  await expect(row).toContainText("100,00 %");

  const closing = authedPage.getByRole("region", { name: "Prueba de cierre" });
  await expect(closing).toContainText("Σ cuota exacta × contribución: $ 120.000,00");
  await expect(closing).toContainText("Gastos del mes: $ 120.000,00");

  await expect(authedPage.getByRole("heading", { name: "Punto de equilibrio", level: 3 })).toBeVisible();
  await expect(authedPage.getByText(/^Equilibrio: /)).toBeVisible();
});
