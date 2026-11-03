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
  // Steps 2 and 3 save the progress, so their "Siguiente" is a button; the
  // placeholders after them still link.
  const next = authedPage
    .getByRole("navigation", { name: "Navegación entre pasos" })
    .getByText("Siguiente", { exact: true });
  const previous = authedPage.getByRole("link", { name: "Anterior", exact: true });

  for (let step = 3; step <= 7; step++) {
    await next.click();
    await expect(authedPage).toHaveURL(new RegExp(`/paso-${step}$`));
    // Step 3 is built; the steps after it are still placeholders.
    const heading = step === 3 ? "Costos variables por unidad" : `Paso ${step}`;
    await expect(authedPage.getByRole("heading", { name: heading, exact: true })).toBeVisible();
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

test("the step navigator links only to steps up to the saved progress", async ({ authedPage }) => {
  // beforeEach saved step 1, so the furthest step is 2 and the user is on it.
  const nav = authedPage.getByRole("navigation", { name: "Progreso de la calculadora" });

  await expect(nav.getByRole("link", { name: "Ir al paso 1" })).toBeVisible();
  for (const step of [3, 4, 5, 6, 7]) {
    await expect(nav.getByRole("link", { name: `Ir al paso ${step}` })).toHaveCount(0);
    await expect(nav.getByLabel(`Paso ${step} bloqueado`)).toHaveAttribute("aria-disabled", "true");
  }

  await nav.getByRole("link", { name: "Ir al paso 1" }).click();
  await expect(authedPage).toHaveURL(/\/paso-1$/);
});

test("Ir al dashboard leaves the wizard for the dashboard", async ({ authedPage }) => {
  await authedPage.goto("/paso-1");
  await authedPage.getByRole("link", { name: "Ir al dashboard" }).click();

  await expect(authedPage).toHaveURL("/dashboard");
});
