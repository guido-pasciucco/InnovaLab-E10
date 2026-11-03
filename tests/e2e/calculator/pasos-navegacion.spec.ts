import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";

// Steps 2, 3 and 6 are built; 4, 5 and 7 are navigation-only placeholders.
// Step 2 is reachable only once step 1 is saved, and "Siguiente" on step 4
// skips step 5 (optional cost of sales and taxes) straight to step 6.
test.beforeEach(async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue({ name: "Pan de avena", unit: "docena", volume: 96 });
});

test("Siguiente walks from step 2 to the results and Anterior walks back", async ({ authedPage }) => {
  // Steps 2, 3, 4 and 6 save the progress, so their "Siguiente" is a button;
  // step 7 still links.
  const next = authedPage
    .getByRole("navigation", { name: "Navegación entre pasos" })
    .getByText("Siguiente", { exact: true });
  const previous = authedPage.getByRole("link", { name: "Anterior", exact: true });
  const headings: Record<number, string> = {
    3: "Costos variables por unidad",
    4: "Paso 4",
    6: "Margen y precio sugerido",
    7: "Paso 7",
  };

  for (const step of [3, 4, 6, 7]) {
    await next.click();
    await expect(authedPage).toHaveURL(new RegExp(`/paso-${step}$`));
    await expect(
      authedPage.getByRole("heading", { name: headings[step], exact: true }),
    ).toBeVisible();
  }

  await next.click();
  await expect(authedPage).toHaveURL(/\/resultados$/);
  await expect(authedPage.getByRole("heading", { name: "Resultados", exact: true })).toBeVisible();
  await expect(next).toHaveCount(0);

  await previous.click();
  await expect(authedPage).toHaveURL(/\/paso-7$/);

  // Step 6 goes back to step 4, the step it was reached from.
  for (const step of [6, 4, 3, 2]) {
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
