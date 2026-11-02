import { createUser, deleteUser } from "../../support/factories/user";
import { signInSessionCookies } from "../helpers/session";
import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";

test("an anonymous visitor is redirected from /dashboard to /login", async ({ page, dashboardPage }) => {
  // Act
  await dashboardPage.goto();

  // Assert
  await expect(page).toHaveURL("/login");
});

test("the dashboard shows the authenticated user", async ({ authedPage, user, dashboardPage }) => {
  // Arrange: `authedPage` is signed in as `user` through the back door.

  // Act
  await dashboardPage.goto();

  // Assert: not bounced to /login, and the page shows who is signed in.
  await expect(authedPage).toHaveURL("/dashboard");
  await expect(dashboardPage.heading).toBeVisible();
  await expect(dashboardPage.userEmail(user.email)).toBeVisible();
});

test("a user without calculations sees the empty state and no cards", async ({ authedPage, dashboardPage }) => {
  await dashboardPage.goto();

  await expect(authedPage).toHaveURL("/dashboard");
  await expect(dashboardPage.emptyState).toBeVisible();
  await expect(dashboardPage.newCalculationButton).toBeVisible();
  await expect(dashboardPage.cards).toHaveCount(0);
});

test("Nuevo cálculo opens step 1 and the saved progress shows on the dashboard", async ({
  authedPage,
  dashboardPage,
}) => {
  await dashboardPage.goto();
  await dashboardPage.newCalculationButton.click();
  await expect(authedPage).toHaveURL(/\/paso-1$/);

  const paso1 = new Paso1Page(authedPage);
  await paso1.saveAndContinue({ name: "Pan de avena", unit: "docena", volume: 96 });
  await dashboardPage.goto();

  await expect(dashboardPage.card("Pan de avena")).toContainText("Paso 2 de 7");
  await expect(authedPage.getByText("Ver pasos")).toHaveCount(0);
});

test("Continuar cálculo reopens the older calculation and edits only that one", async ({
  authedPage,
  dashboardPage,
}) => {
  const paso1 = new Paso1Page(authedPage);
  await paso1.goto();
  await paso1.saveAndContinue({ name: "Primero", unit: "docena", volume: 12 });
  await dashboardPage.goto();
  await dashboardPage.newCalculationButton.click();
  await paso1.saveAndContinue({ name: "Segundo", unit: "docena", volume: 24 });
  await dashboardPage.goto();
  await expect(dashboardPage.cards).toHaveCount(2);

  await dashboardPage.continueCalculation("Primero");
  await expect(authedPage).toHaveURL(/\/paso-2$/);
  await paso1.goto();
  await paso1.saveAndContinue({ name: "Primero editado", unit: "docena", volume: 12 });
  await dashboardPage.goto();

  await expect(dashboardPage.card("Primero editado")).toBeVisible();
  await expect(dashboardPage.card("Segundo")).toBeVisible();
});

test("a user never sees another user's calculations", async ({ authedPage, dashboardPage, browser, baseURL }) => {
  const paso1 = new Paso1Page(authedPage);
  await paso1.goto();
  await paso1.saveAndContinue({ name: "Secreto de A", unit: "docena", volume: 12 });

  const other = await createUser();
  try {
    const context = await browser.newContext({ baseURL });
    const cookies = await signInSessionCookies(other.email, other.password);
    await context.addCookies(
      cookies.map(({ name, value, sameSite }) => ({ name, value, url: baseURL!, sameSite })),
    );
    const otherPage = await context.newPage();
    await otherPage.goto("/dashboard");

    await expect(otherPage.getByText("Secreto de A")).toHaveCount(0);
    await context.close();
  } finally {
    await deleteUser(other.id);
  }
  await dashboardPage.goto();
  await expect(dashboardPage.card("Secreto de A")).toBeVisible();
});
