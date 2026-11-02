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

test("saved fixed costs reach the card when coming back to step 1", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);
  await new Paso2Page(authedPage).addLine("Alquiler", "60000");

  await setup.goto();

  // 60000 / 96 = 625.00 per unit; no variable lines yet, so 0.00 (not a dash).
  await expect(authedPage.getByRole("heading", { name: "Costo unitario $ 625,00" })).toBeVisible();
  await expect(cardValue(authedPage, "Costos fijos")).toHaveText("$ 60.000,00");
  await expect(cardValue(authedPage, "Variable por unidad")).toHaveText("$ 0,00");
  await expect(cardValue(authedPage, "Volumen")).toHaveText("96");
});

test("typing a different volume hides the per-unit amounts but keeps the fixed total", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);
  await new Paso2Page(authedPage).addLine("Alquiler", "60000");
  await setup.goto();

  await setup.volumeInput.fill("48");

  await expect(cardValue(authedPage, "Volumen")).toHaveText("48");
  await expect(authedPage.getByRole("heading", { name: "Costo unitario —" })).toBeVisible();
  await expect(cardValue(authedPage, "Variable por unidad")).toHaveText("—");
  await expect(cardValue(authedPage, "Costos fijos")).toHaveText("$ 60.000,00");

  // Back to the saved volume: the persisted per-unit amounts apply again.
  await setup.volumeInput.fill("96");
  await expect(authedPage.getByRole("heading", { name: "Costo unitario $ 625,00" })).toBeVisible();
});

test("the same card shows the same data on step 2 and updates when a cost is added", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);

  await expect(authedPage.getByRole("heading", { name: "Costo unitario —" })).toBeVisible();
  await expect(cardValue(authedPage, "Volumen")).toHaveText("96");

  await new Paso2Page(authedPage).addLine("Alquiler", "60000");

  await expect(authedPage.getByRole("heading", { name: "Costo unitario $ 625,00" })).toBeVisible();
  await expect(cardValue(authedPage, "Costos fijos")).toHaveText("$ 60.000,00");
  await expect(cardValue(authedPage, "Variable por unidad")).toHaveText("$ 0,00");
  await expect(cardValue(authedPage, "Volumen")).toHaveText("96");
});

test("the card is also shown on the steps that are not built yet", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);
  await new Paso2Page(authedPage).addLine("Alquiler", "60000");

  await authedPage.goto("/paso-3");

  await expect(authedPage.getByRole("heading", { name: "Costo unitario $ 625,00" })).toBeVisible();
  await expect(cardValue(authedPage, "Costos fijos")).toHaveText("$ 60.000,00");
});
