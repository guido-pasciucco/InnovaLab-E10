import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";

// Steps 3 to 7 are navigation-only placeholders; step 2 is reachable only
// once step 1 is saved.
test.beforeEach(async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue({ name: "Pan de avena", unit: "docena", volume: 96 });
});

test("Siguiente walks from step 2 to the results and Anterior walks back", async ({ authedPage }) => {
  const next = authedPage.getByRole("link", { name: "Siguiente", exact: true });
  const previous = authedPage.getByRole("link", { name: "Anterior", exact: true });

  for (let step = 3; step <= 7; step++) {
    await next.click();
    await expect(authedPage).toHaveURL(new RegExp(`/paso-${step}$`));
    await expect(
      authedPage.getByRole("heading", { name: `Paso ${step}`, exact: true }),
    ).toBeVisible();
  }

  await next.click();
  await expect(authedPage).toHaveURL(/\/resultados$/);
  await expect(authedPage.getByRole("heading", { name: "Resultados", exact: true })).toBeVisible();
  await expect(next).toHaveCount(0);

  await previous.click();
  await expect(authedPage).toHaveURL(/\/paso-7$/);

  for (let step = 6; step >= 2; step--) {
    await previous.click();
    await expect(authedPage).toHaveURL(new RegExp(`/paso-${step}$`));
  }
  await expect(
    authedPage.getByRole("heading", { name: "Costos fijos del mes", exact: true }),
  ).toBeVisible();
});
