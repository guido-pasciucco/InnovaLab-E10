import { expect, test } from "../fixtures";
import { PeriodCostsPage } from "../pages/period-costs.page";

// Issue #321: a presentation is what gets priced. The box price is part of
// the suggested price, and raising it updates /precios without another save.

test("prices each presentation and follows a packaging price change", async ({ authedPage }) => {
  await authedPage.goto("/supplies");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  await authedPage.getByLabel("Nombre del insumo").fill("Harina");
  await authedPage.getByRole("textbox", { name: "Precio de compra" }).fill("1000");
  await authedPage.getByRole("combobox", { name: "Unidad de medida" }).selectOption("kg");
  await authedPage.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(authedPage.getByRole("cell", { name: "Harina", exact: true })).toBeVisible();

  await authedPage.getByRole("tab", { name: /Packaging/ }).click();
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  const packaging = authedPage.getByRole("dialog", { name: "Nuevo packaging" });
  await packaging.getByLabel("Nombre del packaging").fill("Caja");
  await packaging.getByRole("textbox", { name: "Precio de compra" }).fill("300");
  await packaging.getByRole("combobox", { name: "Unidad de medida" }).selectOption("unidad");
  await packaging.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(authedPage.getByRole("cell", { name: "Caja", exact: true })).toBeVisible();

  await authedPage.goto("/products");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  const product = authedPage.getByRole("dialog", { name: "Nuevo producto" });
  await product.getByLabel("Nombre del producto").fill("Alfajor");
  await product.getByLabel("Insumo").selectOption({ label: "Harina" });
  await product.getByLabel("Cantidad").fill("1");
  await product.getByLabel("Unidad", { exact: true }).selectOption("kg");
  await product.getByLabel(/obtenés con esta receta/i).fill("10");
  await product.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(authedPage.getByRole("cell", { name: "Alfajor", exact: true })).toBeVisible();

  await authedPage.getByRole("link", { name: "Presentaciones de Alfajor" }).click();

  async function addPresentation(name: string, units: string, capacity: string, withBox: boolean) {
    await authedPage.getByRole("button", { name: "+ Nueva" }).click();
    const dialog = authedPage.getByRole("dialog");
    await dialog.getByLabel("Nombre de la presentación").fill(name);
    await dialog.getByLabel("Unidades que contiene").fill(units);
    await dialog.getByLabel("Capacidad mensual").fill(capacity);
    if (withBox) {
      await dialog.getByRole("button", { name: "+ Agregar packaging" }).click();
      await dialog.getByLabel("Packaging").selectOption({ label: "Caja" });
      await dialog.getByLabel("Cantidad").fill("1");
      await dialog.getByLabel("Unidad", { exact: true }).selectOption("unidad");
    }
    await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(authedPage.getByRole("cell", { name, exact: true })).toBeVisible();
  }

  await addPresentation("Unidad", "1", "100", false);
  await addPresentation("Caja x6", "6", "50", true);

  await authedPage.getByRole("link", { name: "Productos", exact: true }).click();
  await authedPage.getByRole("button", { name: "Editar Alfajor" }).click();
  const edit = authedPage.getByRole("dialog", { name: "Editar producto" });
  await expect(edit.getByText("La capacidad se carga en cada presentación.")).toBeVisible();
  await edit.getByRole("link", { name: "Ver presentaciones" }).click();
  await expect(authedPage.getByRole("cell", { name: "Caja x6", exact: true })).toBeVisible();

  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();
  await periodCosts.addLine("Gastos", "30000");

  await authedPage.goto("/precios");
  await authedPage.getByLabel("Recargo por defecto del negocio").fill("50");
  await authedPage.getByRole("button", { name: "Guardar recargo por defecto" }).click();

  const unit = authedPage.getByRole("row", { name: /Alfajor · Unidad/ });
  const pack = authedPage.getByRole("row", { name: /Alfajor · Caja x6/ });
  await expect(unit).toContainText("$ 450,00");
  await expect(pack).toContainText("$ 1.650,00");

  await authedPage.goto("/supplies");
  await authedPage.getByRole("tab", { name: /Packaging/ }).click();
  await authedPage.getByRole("button", { name: "Editar Caja" }).click();
  const edited = authedPage.getByRole("dialog", { name: "Editar packaging" });
  await edited.getByRole("textbox", { name: "Precio de compra" }).fill("600");
  await edited.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(edited).toHaveCount(0);

  await authedPage.goto("/precios");
  await expect(authedPage.getByRole("row", { name: /Alfajor · Unidad/ })).toContainText("$ 450,00");
  await expect(authedPage.getByRole("row", { name: /Alfajor · Caja x6/ })).toContainText("$ 2.100,00");
});
