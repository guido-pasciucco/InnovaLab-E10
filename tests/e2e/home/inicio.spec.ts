import { expect, test } from "../fixtures";
import { PeriodCostsPage } from "../pages/period-costs.page";

// P07: the home page summarizes how far the account is from the dashboard.
test("an empty account sees its first pending tasks and a pending dashboard", async ({ authedPage }) => {
  await authedPage.goto("/inicio");

  const tasks = authedPage.getByRole("region", { name: "Tareas pendientes" });
  await expect(tasks.getByRole("link", { name: "Cargar tus insumos y packaging" })).toBeVisible();
  await expect(tasks.getByRole("link", { name: "Crear tu primer producto y su receta" })).toBeVisible();
  await expect(authedPage.getByRole("region", { name: "Tu negocio hoy" }).getByText("Pendiente", { exact: true })).toBeVisible();
});

test("loading a supply removes its pending task and counts it", async ({ authedPage }) => {
  await authedPage.goto("/supplies");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  await authedPage.getByLabel("Nombre del insumo").fill("Harina 000");
  await authedPage.getByRole("textbox", { name: "Precio de compra" }).fill("18750");
  await authedPage.getByRole("combobox", { name: "Unidad de medida" }).selectOption("kg");
  await authedPage.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(authedPage.getByRole("cell", { name: "Harina 000", exact: true })).toBeVisible();

  await authedPage.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Inicio" }).click();

  await expect(authedPage).toHaveURL("/inicio");
  const tasks = authedPage.getByRole("region", { name: "Tareas pendientes" });
  await expect(tasks.getByRole("link", { name: "Cargar tus insumos y packaging" })).toHaveCount(0);
  await expect(tasks.getByRole("link", { name: "Crear tu primer producto y su receta" })).toBeVisible();
});

test("the period costs shortcut opens its screen inside the app shell", async ({ authedPage }) => {
  await authedPage.goto("/inicio");

  await authedPage.getByRole("link", { name: /Cargar gastos del período/ }).click();

  await expect(authedPage).toHaveURL("/period-costs");
  await expect(authedPage.getByRole("navigation", { name: "Principal" })).toBeVisible();
});

// #319: steps 3 and 4 of the validation table. Capacity and expenses are
// loaded but the markup is not; after saving it, the card shows the same
// figure as /equilibrio.
async function arrangePricedProduct(authedPage: import("@playwright/test").Page) {
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
  await dialog.getByLabel("¿Cuántas unidades pensás fabricar este mes?").fill("200");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(authedPage.getByRole("cell", { name: "Pan flauta", exact: true })).toBeVisible();

  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();
  await periodCosts.addLine("Alquiler", "150000");
}

test("asks for the markup, then shows the break-even figure from the engine", async ({ authedPage }) => {
  await arrangePricedProduct(authedPage);
  await authedPage.goto("/inicio");

  const summary = authedPage.getByRole("region", { name: "Tu negocio hoy" });
  const tasks = authedPage.getByRole("region", { name: "Tareas pendientes" });
  await expect(tasks.getByRole("link", { name: "Cargar el recargo de 1 producto" })).toBeVisible();
  await expect(summary.getByText("Pendiente", { exact: true })).toBeVisible();
  await expect(authedPage.getByRole("link", { name: /Ver precios/ })).toBeVisible();
  await expect(authedPage.getByRole("link", { name: /Ver el equilibrio/ })).toBeVisible();

  await authedPage.goto("/precios");
  await authedPage.getByLabel("Recargo por defecto del negocio").fill("30");
  await authedPage.getByRole("button", { name: "Guardar recargo por defecto" }).click();
  await expect(authedPage.getByRole("status")).toContainText("Recargo guardado.");

  await authedPage.goto("/equilibrio");
  const sales = await authedPage.getByText("Equilibrio en ventas").locator("..").locator("dd").innerText();

  await authedPage.goto("/inicio");
  await expect(tasks.getByRole("link", { name: "Cargar el recargo de 1 producto" })).toHaveCount(0);
  await expect(authedPage.getByText("Todo listo para ver el equilibrio.")).toBeVisible();
  const card = summary.getByRole("link", { name: /Equilibrio/ });
  await expect(card).toContainText(sales);
  await expect(card).toContainText("ventas por mes para cubrir los gastos");
  await expect(card).toHaveAttribute("href", "/equilibrio");
  await card.click();
  await expect(authedPage).toHaveURL("/equilibrio");
});
