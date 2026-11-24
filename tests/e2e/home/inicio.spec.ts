import { expect, test } from "../fixtures";

// P07: the home page summarizes how far the account is from the dashboard.
test("an empty account sees its first pending tasks and a pending dashboard", async ({ authedPage }) => {
  await authedPage.goto("/inicio");

  const tasks = authedPage.getByRole("region", { name: "Tareas pendientes" });
  await expect(tasks.getByRole("link", { name: "Cargar tus insumos y packaging" })).toBeVisible();
  await expect(tasks.getByRole("link", { name: "Crear tu primer producto y su receta" })).toBeVisible();
  await expect(authedPage.getByRole("region", { name: "Tu negocio hoy" }).getByText("Pendiente", { exact: true })).toBeVisible();
});

test("loading a supply removes its pending task and counts it", async ({ authedPage }) => {
  await authedPage.goto("/insumos");
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
