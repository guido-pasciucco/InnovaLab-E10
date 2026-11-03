import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";

// Steps 2 to 8 are built. Step 2 is reachable only once step 1 is saved.
test.beforeEach(async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue({ name: "Pan de avena", unit: "docena", volume: 96 });
});

test("Siguiente walks from step 2 to step 8 and Anterior walks back", async ({ authedPage }) => {
  // Steps 2 to 7 save the progress, so their "Siguiente" is a button; step 8
  // is the last one and has none.
  const next = authedPage
    .getByRole("navigation", { name: "Navegación entre pasos" })
    .getByText("Siguiente", { exact: true });
  const previous = authedPage.getByRole("link", { name: "Anterior", exact: true });
  const headings: Record<number, string> = {
    3: "Costos variables por unidad",
    4: "Trabajo propio e indirectos",
    5: "Margen y precio sugerido",
    6: "Punto de equilibrio",
    7: "Comparar escenarios",
    8: "Resumen y compartir",
  };

  for (const step of [3, 4, 5, 6, 7, 8]) {
    await next.click();
    await expect(authedPage).toHaveURL(new RegExp(`/paso-${step}$`));
    await expect(
      authedPage.getByRole("heading", { name: headings[step], exact: true }),
    ).toBeVisible();
  }

  await expect(next).toHaveCount(0);

  for (const step of [7, 6, 5, 4, 3, 2]) {
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
  for (const step of [3, 4, 5, 6, 7, 8]) {
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

test("opening step 7 before it is unlocked goes back to the saved step", async ({ authedPage }) => {
  // beforeEach saved step 1 only, so the furthest step is 2.
  await authedPage.goto("/paso-7");

  await expect(authedPage).toHaveURL(/\/paso-2$/);
});
