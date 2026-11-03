import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";
import { Paso2Page, VARIABLE_COSTS_STEP } from "../pages/paso-2.page";
import { Paso6Page } from "../pages/paso-6.page";

// Mockup example: fixed 320.000, variable 2.500 per unit and 200 units give a
// unit cost of 4.100; with a 30 % margin on the selling price the price is
// 5.857,14. Step 4 skips step 5 (optional cost of sales and taxes).
//
// The cost summary divides the sum of the variable lines by the volume
// (getCalculatorCostSummaryService), so the 2.500 per unit is loaded as its
// period total: 2.500 × 200 = 500.000.
test.beforeEach(async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue({ name: "Pan de avena", unit: "docena", volume: 200 });

  const next = authedPage.getByRole("button", { name: "Siguiente", exact: true });
  await new Paso2Page(authedPage).addLine("Alquiler", "320000");
  await next.click();
  await expect(authedPage).toHaveURL(/\/paso-3$/);
  await new Paso2Page(authedPage, VARIABLE_COSTS_STEP).addLine("Envase", "500000");
  await next.click();
  await expect(authedPage).toHaveURL(/\/paso-4$/);
  await next.click();
  await expect(authedPage).toHaveURL(/\/paso-6$/);
});

test("the default 30 % margin shows the mockup price, contribution and profit", async ({
  authedPage,
}) => {
  const step = new Paso6Page(authedPage);
  await step.expectLoaded();

  await expect(step.marginInput).toHaveValue("30");
  await expect(
    authedPage.getByText("Con 30 %, de cada $100 que cobrás, $30 son ganancia.", { exact: false }),
  ).toBeVisible();
  await step.expectCard("Costo unitario", "$4.100");
  await step.expectCard("Precio sugerido", "$5.857,14");
  await step.expectCard("Contribución por unidad", "$3.357,14");
  await step.expectCard("Ganancia estimada", "$351.428,57");
});

test("a margin of 100 % shows the rule message and keeps the user on step 6", async ({
  authedPage,
}) => {
  const step = new Paso6Page(authedPage);

  await step.marginInput.fill("100");

  await expect(step.alerts).toHaveText("El margen tiene que ser menor que 100 %.");
  await step.expectCard("Precio sugerido", "—");
  await step.next.click();
  await expect(authedPage).toHaveURL(/\/paso-6$/);
});

test("the saved margin survives a reload", async ({ authedPage }) => {
  const step = new Paso6Page(authedPage);
  await step.saveMargin("40");

  await authedPage.reload();

  await expect(step.marginInput).toHaveValue("40");
  // 4100 / 0.6 = 6833.33
  await step.expectCard("Precio sugerido", "$6.833,33");
});

test("Siguiente opens step 7 and Anterior goes back to step 4", async ({ authedPage }) => {
  const step = new Paso6Page(authedPage);

  await step.next.click();
  await expect(authedPage).toHaveURL(/\/paso-7$/);

  await authedPage.getByRole("link", { name: "Anterior", exact: true }).click();
  await expect(authedPage).toHaveURL(/\/paso-6$/);
  await step.previous.click();
  await expect(authedPage).toHaveURL(/\/paso-4$/);
});
