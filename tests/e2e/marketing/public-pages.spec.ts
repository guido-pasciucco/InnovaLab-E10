import { expect, test } from "../fixtures";
import { LoginPage } from "../pages/login.page";

const publicPages = [
  "/",
  "/calculadora-de-costos",
  "/licitaciones-de-insumos",
  "/asistente-ia",
] as const;

const forbiddenText = [
  "escenario",
  "pdf",
  "tu trabajo y costos indirectos",
  "celular funda",
  "un cálculo por cada producto",
  "8 pasos",
] as const;

for (const path of publicPages) {
  test(`${path} loads without a session and shows the shared header and footer`, async ({ page }) => {
    await page.goto(path);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    for (const dropdown of ["Calculadora de costos", "Licitaciones", "Asistente IA"]) {
      await expect(page.getByRole("button", { name: dropdown })).toBeVisible();
    }

    const text = (await page.locator("body").innerText()).toLowerCase();
    for (const banned of forbiddenText) {
      expect(text, `forbidden copy on ${path}`).not.toContain(banned);
    }
  });
}

test("the keyboard opens a dropdown and reaches the calculator break-even section", async ({ page }) => {
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Calculadora de costos" });
  await trigger.focus();
  await trigger.press("ArrowDown");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Ver todo" })).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("link", { name: "Punto de equilibrio" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/calculadora-de-costos#equilibrio$/);
  await expect(page.locator("#equilibrio h2")).toBeVisible();

  // Choosing an item closes the menu; reopen it to check the current-page mark.
  await trigger.click();
  await expect(page.getByRole("link", { name: "Ver todo" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("Escape closes the dropdown and returns focus to its trigger", async ({ page }) => {
  await page.goto("/calculadora-de-costos");

  const trigger = page.getByRole("button", { name: "Licitaciones" });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await trigger.press("Escape");

  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("only one dropdown stays open at a time", async ({ page }) => {
  await page.goto("/");

  const calculator = page.getByRole("button", { name: "Calculadora de costos" });
  const tenders = page.getByRole("button", { name: "Licitaciones" });
  await calculator.click();
  await tenders.click();

  await expect(calculator).toHaveAttribute("aria-expanded", "false");
  await expect(tenders).toHaveAttribute("aria-expanded", "true");
});

test("the mobile menu opens an accordion and navigates to a section", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Menú" }).click();
  const accordion = page.getByRole("button", { name: "Licitaciones" }).last();
  await accordion.click();
  await expect(accordion).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("link", { name: "Qué es" }).click();

  await expect(page).toHaveURL(/\/licitaciones-de-insumos#que-es$/);
  await expect(page.locator("#que-es h2")).toBeVisible();
});

test("a public CTA sends an anonymous visitor through login and back to the destination", async ({
  page,
  user,
}) => {
  await page.goto("/calculadora-de-costos");
  await page.getByRole("link", { name: "Calcular mis costos" }).first().click();

  await expect(page).toHaveURL(/\/login\?next=/);

  const loginPage = new LoginPage(page);
  await loginPage.logIn(user);

  await expect(page).toHaveURL("/inicio");
});
