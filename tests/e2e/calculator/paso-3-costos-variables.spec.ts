import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";

// Step 2 and step 3 unlock the next step when "Siguiente" is pressed, with or
// without cost lines: the guard of each step reads the saved progress.
test.beforeEach(async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue({ name: "Pan de avena", unit: "docena", volume: 96 });
});

test("Siguiente on step 2 opens step 3 and Siguiente on step 3 opens step 4", async ({
  authedPage,
}) => {
  const next = authedPage.getByRole("button", { name: "Siguiente", exact: true });

  await next.click();

  await expect(authedPage).toHaveURL(/\/paso-3$/);
  await expect(
    authedPage.getByRole("heading", { name: "Costos variables por unidad", exact: true }),
  ).toBeVisible();

  await next.click();

  await expect(authedPage).toHaveURL(/\/paso-4$/);
  await expect(authedPage.getByRole("heading", { name: "Trabajo propio e indirectos", exact: true })).toBeVisible();
});

test("step 3 stays open after a reload once Siguiente on step 2 unlocked it", async ({
  authedPage,
}) => {
  await authedPage.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(authedPage).toHaveURL(/\/paso-3$/);

  await authedPage.reload();

  await expect(authedPage).toHaveURL(/\/paso-3$/);
  await expect(
    authedPage.getByRole("heading", { name: "Costos variables por unidad", exact: true }),
  ).toBeVisible();
});
