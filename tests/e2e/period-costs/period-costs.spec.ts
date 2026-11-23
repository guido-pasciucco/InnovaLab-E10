import { expect, test } from "../fixtures";
import { PeriodCostsPage } from "../pages/period-costs.page";

// Period expenses are loaded once for the whole product list (#243). The
// catalog pattern (#285) keeps the same server-owned total, now with a modal
// for create/edit, a search and a confirmation before deleting.

test("a user without period expenses sees an empty list and a dash as total", async ({
  authedPage,
}) => {
  const periodCosts = new PeriodCostsPage(authedPage);

  await periodCosts.goto();

  await expect(periodCosts.rows).toHaveCount(0);
  await periodCosts.expectSubtotal("—");
});

test("a new expense is saved, summed by the server and survives a reload", async ({
  authedPage,
}) => {
  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();

  await periodCosts.addLine("Alquiler", "150.000");

  await periodCosts.expectSubtotal("$150.000");
  await expect(periodCosts.rows).toHaveCount(1);
  await expect(periodCosts.rows.first()).toContainText("Alquiler");

  await authedPage.reload();
  await periodCosts.expectLoaded();

  await expect(periodCosts.rows).toHaveCount(1);
  await periodCosts.expectSubtotal("$150.000");
});

test("two expenses add up with cents and both survive a reload", async ({
  authedPage,
}) => {
  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();

  await periodCosts.addLine("Alquiler", "150000");
  await periodCosts.addLine("Servicios", "25.000,50");

  await periodCosts.expectSubtotal("$175.000,50");
  await expect(periodCosts.rows).toHaveCount(2);

  await authedPage.reload();
  await periodCosts.expectLoaded();

  await expect(periodCosts.rows).toHaveCount(2);
  await periodCosts.expectSubtotal("$175.000,50");
});

test("editing an expense updates its concept and amount and persists", async ({
  authedPage,
}) => {
  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();
  await periodCosts.addLine("Alquiler", "150000");

  await periodCosts.editLine("Alquiler", "Alquiler del local", "180.000,25");

  await expect(periodCosts.rows.first()).toContainText("Alquiler del local");
  await periodCosts.expectSubtotal("$180.000,25");

  await authedPage.reload();
  await periodCosts.expectLoaded();

  await expect(periodCosts.rows.first()).toContainText("Alquiler del local");
  await periodCosts.expectSubtotal("$180.000,25");
});

test("a cancelled delete keeps the expense, a confirmed one removes it from the total", async ({
  authedPage,
}) => {
  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();
  await periodCosts.addLine("Alquiler", "150000");
  await periodCosts.addLine("Servicios", "25.000,50");

  authedPage.once("dialog", (dialog) => dialog.dismiss());
  await authedPage.getByRole("button", { name: "Borrar Alquiler" }).click();
  await expect(periodCosts.rows).toHaveCount(2);

  await periodCosts.deleteLine("Alquiler");

  await expect(periodCosts.rows).toHaveCount(1);
  await periodCosts.expectSubtotal("$25.000,50");

  await authedPage.reload();
  await periodCosts.expectLoaded();

  await expect(periodCosts.rows).toHaveCount(1);
  await periodCosts.expectSubtotal("$25.000,50");
});

test("an invalid amount is explained and not saved", async ({ authedPage }) => {
  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();

  await periodCosts.newButton.click();
  await periodCosts.dialog.getByLabel("Concepto", { exact: true }).fill("Alquiler");
  await periodCosts.dialog.getByLabel("Importe del mes", { exact: true }).fill("abc");
  await periodCosts.dialog.getByRole("button", { name: "Guardar" }).click();

  await expect(periodCosts.dialog.getByRole("alert")).toHaveText(
    "El importe debe ser un número.",
  );
  await expect(periodCosts.dialog).toBeVisible();
  await periodCosts.expectSubtotal("—");

  await periodCosts.dialog.getByRole("button", { name: "Cancelar" }).click();
  await authedPage.reload();
  await periodCosts.expectLoaded();

  await expect(periodCosts.rows).toHaveCount(0);
  await periodCosts.expectSubtotal("—");
});

test("the search filters expenses by concept without changing the total", async ({
  authedPage,
}) => {
  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();
  await periodCosts.addLine("Alquiler", "150000");
  await periodCosts.addLine("Servicios", "25000");

  await periodCosts.search.fill("alqu");

  await expect(periodCosts.rows).toHaveCount(1);
  await expect(periodCosts.rows.first()).toContainText("Alquiler");
  await periodCosts.expectSubtotal("$175.000");
});

test("the left sidebar keeps Gastos del período as the active destination", async ({
  authedPage,
}) => {
  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();

  const sidebar = authedPage.getByRole("complementary").getByRole("navigation", {
    name: "Principal",
  });
  await expect(sidebar).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: "Gastos del período" }),
  ).toHaveAttribute("aria-current", "page");
});
