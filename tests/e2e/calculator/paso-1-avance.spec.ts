import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";

// Wizard progress: "Siguiente" persists how far the user got, the chrome
// follows the route they are viewing, and they can go back to edit earlier
// steps without losing that progress.
const saved = { name: "Pan de avena", unit: "docena", volume: 96 };
const edited = { name: "Galletas de limón", unit: "caja", volume: 144 };

const headerStep = (page: Page, step: number) =>
  page.locator("header").getByText(`Paso ${step} de 7`, { exact: true });
const progressItem = (page: Page, step: number) =>
  page.getByRole("navigation", { name: "Progreso de la calculadora" }).locator(`li[data-step="${step}"]`);

test("Siguiente leads to step 2 and the header and progress follow the route", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await expect(headerStep(authedPage, 1)).toBeVisible();

  await setup.saveAndContinue(saved);

  await expect(headerStep(authedPage, 2)).toBeVisible();
  await expect(progressItem(authedPage, 1)).toHaveAttribute("data-complete", "true");
  await expect(progressItem(authedPage, 2)).toHaveAttribute("data-current", "true");
});

test("step 2 stays reachable after a reload and after signing out and in", async ({
  authedPage, user, dashboardPage, loginPage,
}) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);

  await authedPage.reload();
  await setup.expectOnStep2();

  await dashboardPage.goto();
  await dashboardPage.signOut();
  await expect(authedPage).toHaveURL("/login");
  await loginPage.logIn(user);
  await expect(authedPage).toHaveURL("/");
  await authedPage.goto("/paso-2");
  await setup.expectOnStep2();
});

test("going back to edit step 1 keeps the progress and lands on step 2 again", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);

  await authedPage.getByRole("link", { name: "Ir al paso 1" }).click();
  await expect(authedPage).toHaveURL(/\/paso-1$/);
  await expect(headerStep(authedPage, 1)).toBeVisible();
  await setup.expectValues(saved);
  // Step 1 is the one being edited, and step 2 stays reachable from here.
  await expect(authedPage.getByRole("link", { name: "Ir al paso 2" })).toBeVisible();

  await setup.saveAndContinue(edited);
  await authedPage.goto("/paso-1");
  await setup.expectValues(edited);
  await authedPage.goto("/paso-2");
  await setup.expectOnStep2();
});

test("the progress bar links back to a reachable step", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);

  await authedPage.getByRole("link", { name: "Ir al paso 1" }).click();

  await expect(authedPage).toHaveURL(/\/paso-1$/);
  await setup.expectValues(saved);
});

test("a user who has not saved step 1 is sent back from step 2", async ({ authedPage }) => {
  await authedPage.goto("/paso-2");

  await expect(authedPage).toHaveURL(/\/paso-1$/);
  await expect(authedPage.getByRole("link", { name: "Ir al paso 2" })).toHaveCount(0);
});
