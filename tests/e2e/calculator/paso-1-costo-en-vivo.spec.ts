import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";
import { Paso2Page } from "../pages/paso-2.page";

const saved = { name: "Pan de avena", unit: "docena", volume: 96 };

// The card sits beside the form; each row is a label followed by its value.
function cardValue(page: import("@playwright/test").Page, label: string) {
  return page
    .getByText(label, { exact: true })
    .locator("xpath=following-sibling::span");
}

test("a draft without costs shows dashes in every amount", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();

  await expect(authedPage.getByRole("heading", { name: "Costo unitario —" })).toBeVisible();
  await expect(cardValue(authedPage, "Costos fijos")).toHaveText("—");
  await expect(cardValue(authedPage, "Variable por unidad")).toHaveText("—");
});

test("saved fixed costs reach the card; per-unit amounts wait for a variable cost", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);
  await new Paso2Page(authedPage).addLine("Alquiler", "60000");

  await setup.goto();

  await expect(authedPage.getByRole("heading", { name: "Costo unitario —" })).toBeVisible();
  await expect(cardValue(authedPage, "Costos fijos")).toHaveText("$60.000");
  await expect(cardValue(authedPage, "Variable por unidad")).toHaveText("—");
  await expect(cardValue(authedPage, "Volumen")).toHaveText("96");
});

test("typing a different volume updates the card's volume and keeps the fixed total", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);
  await new Paso2Page(authedPage).addLine("Alquiler", "60000");
  await setup.goto();

  await setup.volumeInput.fill("48");

  await expect(cardValue(authedPage, "Volumen")).toHaveText("48");
  await expect(cardValue(authedPage, "Costos fijos")).toHaveText("$60.000");

  await setup.volumeInput.fill("96");
  await expect(cardValue(authedPage, "Volumen")).toHaveText("96");
});

test("the same card shows the same data on step 2 and updates when a cost is added", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);

  await expect(cardValue(authedPage, "Costos fijos")).toHaveText("—");
  await expect(cardValue(authedPage, "Volumen")).toHaveText("96");

  await new Paso2Page(authedPage).addLine("Alquiler", "60000");
  await new Paso2Page(authedPage).addLine("Servicios", "1.500,50");

  await expect(cardValue(authedPage, "Costos fijos")).toHaveText("$61.500,50");
  await expect(cardValue(authedPage, "Variable por unidad")).toHaveText("—");
  await expect(cardValue(authedPage, "Volumen")).toHaveText("96");
});

test("the card is also shown on the steps that are not built yet", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);
  await new Paso2Page(authedPage).addLine("Alquiler", "60000");

  await authedPage.goto("/paso-3");

  await expect(cardValue(authedPage, "Costos fijos")).toHaveText("$60.000");
  await expect(cardValue(authedPage, "Volumen")).toHaveText("96");
});
