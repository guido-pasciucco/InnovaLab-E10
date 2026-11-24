import { expect, test } from "../fixtures";
import { PeriodCostsPage } from "../pages/period-costs.page";

// Issue #312: the pricing screen closes P-06. The business default applies to
// every product without an own markup; an own markup overrides it and can be
// cleared with "Usar el del negocio".

async function arrangeProduct(authedPage: import("@playwright/test").Page) {
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

test("a user without products is invited to create one", async ({ authedPage }) => {
  await authedPage.goto("/precios");

  await expect(
    authedPage.getByRole("heading", { name: "Precios", exact: true }),
  ).toBeVisible();
  await expect(authedPage.getByText("Todavía no cargaste ningún producto.")).toBeVisible();
  await expect(authedPage.getByText("Falta la capacidad mensual")).toBeVisible();
});

test("saves the default markup, overrides it in one product and goes back", async ({
  authedPage,
}) => {
  await arrangeProduct(authedPage);
  await authedPage.goto("/precios");

  const row = authedPage.getByRole("row", { name: /Pan flauta/ });
  // Cost: 250 g * 18,75 / 12 = 390,63 + 1.000 of indirect per unit.
  await expect(row).toContainText("$ 1.390,63");
  await expect(row).toContainText("Cargá un recargo para ver el precio sugerido.");

  await authedPage.getByLabel("Recargo por defecto del negocio").fill("30");
  await authedPage.getByRole("button", { name: "Guardar recargo por defecto" }).click();

  await expect(row).toContainText("30,00 %");
  await expect(row).toContainText("Del negocio");
  await expect(row).toContainText("$ 1.807,82");
  await expect(row).toContainText("$ 417,19");
  await expect(row).toContainText("23,08 %");
  await expect(authedPage.getByRole("status")).toContainText("Recargo guardado.");

  await authedPage.getByRole("textbox", { name: "Recargo de Pan flauta" }).fill("50");
  await row.getByRole("button", { name: "Guardar", exact: true }).click();

  await expect(row).toContainText("Propio");
  await expect(row).toContainText("$ 2.085,95");
  await expect(row).toContainText("33,33 %");

  await row.getByRole("button", { name: "Usar el del negocio" }).click();

  await expect(row).toContainText("Del negocio");
  await expect(row).toContainText("$ 1.807,82");

  await authedPage.reload();
  await expect(authedPage.getByRole("row", { name: /Pan flauta/ })).toContainText("$ 1.807,82");
});

test("rejects a zero markup in the client", async ({ authedPage }) => {
  await arrangeProduct(authedPage);
  await authedPage.goto("/precios");

  await authedPage.getByLabel("Recargo por defecto del negocio").fill("0");
  await authedPage.getByRole("button", { name: "Guardar recargo por defecto" }).click();

  await expect(
    authedPage.getByText(
      "Con un recargo de 0 o negativo el precio quedaría igual o por debajo del costo.",
    ),
  ).toBeVisible();
  await expect(authedPage.getByRole("row", { name: /Pan flauta/ })).toContainText(
    "Cargá un recargo para ver el precio sugerido.",
  );
});
