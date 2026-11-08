import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";
import { Paso2Page, VARIABLE_COSTS_STEP } from "../pages/paso-2.page";
import { Paso5Page } from "../pages/paso-5.page";

// Mockup example shared with steps 5 to 7: fixed 320.000, variable 2.500 per
// unit, 200 units and a 30 % margin give a unit cost of 4.100, a price of
// 5.857,14, a profit of 351.428,57 and a break-even of 96 units (558.298,08).
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
  for (const step of [6, 7, 8]) {
    await next.click();
    await expect(authedPage).toHaveURL(new RegExp(`/paso-${step}$`));
  }
});

// The value of a summary row: the <dd> next to the <dt> named `label`.
const row = (page: Page, label: string) =>
  page
    .locator("dl > div")
    .filter({ has: page.getByRole("term").getByText(label, { exact: true }) })
    .getByRole("definition");

test("step 8 summarizes the saved figures and assumptions", async ({ authedPage }) => {
  await expect(
    authedPage.getByRole("heading", { name: "Resumen y compartir", exact: true }),
  ).toBeVisible();

  await expect(row(authedPage, "Producto")).toHaveText("Pan de avena");
  await expect(row(authedPage, "Costo unitario")).toHaveText("$4.100");
  await expect(row(authedPage, "Precio sugerido")).toHaveText("$5.857,14");
  await expect(row(authedPage, "Margen real")).toHaveText("30 %");
  await expect(row(authedPage, "Ganancia estimada")).toHaveText("$351.428,57");
  await expect(row(authedPage, "Equilibrio")).toHaveText("96 u. · $558.298,08");
  await expect(
    authedPage.getByText("Supuestos: período mensual, 200 unidades, sin costos de venta.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    authedPage.getByRole("button", { name: "Enviar por WhatsApp", exact: true }),
  ).toBeDisabled();
});

test("Descargar ficha en PDF downloads the summary as a PDF", async ({ authedPage }) => {
  const download = authedPage.waitForEvent("download");
  await authedPage.getByRole("link", { name: "Descargar ficha en PDF", exact: true }).click();

  expect((await download).suggestedFilename()).toBe("ficha-costos.pdf");
});

test("Anterior goes back to step 7 and Nuevo cálculo opens a new step 1", async ({
  authedPage,
}) => {
  await authedPage.getByRole("link", { name: "Anterior", exact: true }).click();
  await expect(authedPage).toHaveURL(/\/paso-7$/);
  await authedPage.goBack();

  await authedPage.getByRole("button", { name: "Nuevo cálculo", exact: true }).click();
  await expect(authedPage).toHaveURL(/\/paso-1$/);
});
