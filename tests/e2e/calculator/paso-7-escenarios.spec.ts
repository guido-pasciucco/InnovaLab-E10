import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";
import { Paso2Page, VARIABLE_COSTS_STEP } from "../pages/paso-2.page";
import { Paso5Page } from "../pages/paso-5.page";
import { Paso7Page } from "../pages/paso-7.page";

// Mockup example: fixed 320.000, variable 2.500 per unit and 200 units give a
// unit cost of 4.100; the 30 % margin prices it at 5.857,14, with a profit of
// 351.428,57 and a break-even of 96 units. A manual price of 5.000 leaves an
// 18 % margin, 180.000 of profit and 128 units to break even.
test.beforeEach(async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue({ name: "Pan de avena", unit: "docena", volume: 200 });

  const next = authedPage.getByRole("button", { name: "Siguiente", exact: true });
  await new Paso2Page(authedPage).addLine("Alquiler", "320000");
  await next.click();
  await expect(authedPage).toHaveURL(/\/paso-3$/);
  await new Paso2Page(authedPage, VARIABLE_COSTS_STEP).addLine("Envase", "2500");
  await next.click();
  await expect(authedPage).toHaveURL(/\/paso-4$/);
  await next.click();
  await expect(authedPage).toHaveURL(/\/paso-5$/);
  await new Paso5Page(authedPage).saveMargin("30");
  await next.click();
  await expect(authedPage).toHaveURL(/\/paso-6$/);
  await next.click();
  await expect(authedPage).toHaveURL(/\/paso-7$/);
});

test("step 7 shows the base built from the saved costs and margin", async ({ authedPage }) => {
  const step = new Paso7Page(authedPage);
  await step.expectLoaded();

  await expect(step.columnHeaders()).toHaveText(["Base"]);
  await expect(step.cell("Precio", 0)).toContainText("$5.857,14");
  await expect(step.cell("Margen real", 0)).toContainText("30 %");
  await expect(step.cell("Ganancia estimada", 0)).toContainText("$351.428,57");
  await expect(step.cell("Unidades de equilibrio", 0)).toContainText("96");
});

test("an alternative with a manual price shows its deltas against the base", async ({
  authedPage,
}) => {
  const step = new Paso7Page(authedPage);

  await step.duplicateBase();
  await step.editScenario("Base (copia)", { name: "Precio redondo", price: "5000" });

  await expect(step.columnHeaders()).toHaveText(["Base", "Precio redondo"]);
  await expect(step.cell("Margen real", 1)).toContainText("12 puntos menos que la base");
  await expect(step.cell("Ganancia estimada", 1)).toContainText(
    "$171.428,57 menos que la base",
  );
  await expect(step.cell("Unidades de equilibrio", 1)).toContainText("32 más que la base");
});

test("a price below the variable cost shows that there is no break-even", async ({
  authedPage,
}) => {
  const step = new Paso7Page(authedPage);

  await step.duplicateBase();
  await step.editScenario("Base (copia)", { price: "2400" });

  await expect(step.cell("Unidades de equilibrio", 1)).toContainText("Sin equilibrio");
});

test("duplicating stops at 3 scenarios and deleting one enables it again", async ({
  authedPage,
}) => {
  const step = new Paso7Page(authedPage);

  await step.duplicateBase();
  await step.duplicateBase();

  await expect(step.duplicate).toBeDisabled();
  await authedPage
    .getByRole("button", { name: "Eliminar Base (copia)", exact: true })
    .first()
    .click();
  await expect(step.columnHeaders()).toHaveCount(2);
  await expect(step.duplicate).toBeEnabled();
});

test("the base has no editor and survives a reload unchanged", async ({ authedPage }) => {
  const step = new Paso7Page(authedPage);
  await step.duplicateBase();
  await step.editScenario("Base (copia)", { volume: "250" });

  await authedPage.reload();

  await expect(step.editor("Base")).toHaveCount(0);
  await expect(step.cell("Precio", 0)).toContainText("$5.857,14");
  await expect(step.editor("Base (copia)").getByLabel("Unidades del mes")).toHaveValue("250");
  // 320000 / 250 + 2500 = 3780; 3780 / 0.7 = 5400.
  await expect(step.cell("Precio", 1)).toContainText("$5.400");
});

test("the inflation box shows the margin lost and the price that keeps it", async ({
  authedPage,
}) => {
  const step = new Paso7Page(authedPage);

  await step.increaseInput.fill("10");

  await expect(step.inflation).toContainText(
    "Si no actualizás el precio, tu margen baja de 30 % a 25,73 % y tu ganancia, de $351.428,57 a $301.428,57.",
  );
  await expect(step.inflation).toContainText(
    "Para mantener un 30 % tendrías que cobrar $6.214,29 (+6,1 %).",
  );
});

test("Anterior goes back to step 6 and Nuevo cálculo opens a new step 1", async ({
  authedPage,
}) => {
  const step = new Paso7Page(authedPage);

  await step.previous.click();
  await expect(authedPage).toHaveURL(/\/paso-6$/);
  await authedPage.goBack();
  await step.expectLoaded();

  await step.newCalculation.click();
  await expect(authedPage).toHaveURL(/\/paso-1$/);
});
