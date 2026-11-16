import { expect, test } from "../fixtures";
import { PeriodCostsPage } from "../pages/period-costs.page";

// Period expenses are loaded once for the whole product list (#243): the same
// server-rendered total must come back after a reload, without loading them
// again per product.

test("a user without period expenses sees an empty list and a dash as total", async ({
  authedPage,
}) => {
  const periodCosts = new PeriodCostsPage(authedPage);

  await periodCosts.goto();

  await expect(periodCosts.lines).toHaveCount(0);
  await periodCosts.expectSubtotal("—");
});

test("a new expense is saved, summed by the server and survives a reload", async ({
  authedPage,
}) => {
  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();

  await periodCosts.addLine("Alquiler", "150.000");

  await periodCosts.expectSubtotal("$150.000");
  await expect(periodCosts.amountInputs.nth(0)).toHaveValue("$150.000");

  await authedPage.reload();
  await periodCosts.expectLoaded();

  await expect(periodCosts.lines).toHaveCount(1);
  await expect(periodCosts.conceptInputs.nth(0)).toHaveValue("Alquiler");
  await periodCosts.expectSubtotal("$150.000");
});

test("two expenses add up with cents and both survive a reload", async ({ authedPage }) => {
  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();

  await periodCosts.addLine("Alquiler", "150000");
  await periodCosts.addLine("Servicios", "25.000,50");

  await periodCosts.expectSubtotal("$175.000,50");

  await authedPage.reload();
  await periodCosts.expectLoaded();

  await expect(periodCosts.lines).toHaveCount(2);
  await periodCosts.expectSubtotal("$175.000,50");
});

test("editing an expense amount updates the total and persists", async ({ authedPage }) => {
  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();
  await periodCosts.addLine("Alquiler", "150000");

  await periodCosts.editAmount(0, "180.000,25");

  await periodCosts.expectSubtotal("$180.000,25");

  await authedPage.reload();
  await periodCosts.expectLoaded();

  await expect(periodCosts.amountInputs.nth(0)).toHaveValue("$180.000,25");
  await periodCosts.expectSubtotal("$180.000,25");
});

test("deleting an expense removes it from the total and it does not come back", async ({
  authedPage,
}) => {
  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();
  await periodCosts.addLine("Alquiler", "150000");
  await periodCosts.addLine("Servicios", "25.000,50");

  await periodCosts.deleteLine("Alquiler");

  await expect(periodCosts.lines).toHaveCount(1);
  await periodCosts.expectSubtotal("$25.000,50");

  await authedPage.reload();
  await periodCosts.expectLoaded();

  await expect(periodCosts.conceptInputs.nth(0)).toHaveValue("Servicios");
  await periodCosts.expectSubtotal("$25.000,50");
});

test("an invalid amount is explained and not saved", async ({ authedPage }) => {
  const periodCosts = new PeriodCostsPage(authedPage);
  await periodCosts.goto();

  await periodCosts.addButton.click();
  await periodCosts.newConceptInput.fill("Alquiler");
  await periodCosts.amountInputs.nth(0).fill("abc");
  await periodCosts.amountInputs.nth(0).blur();

  await expect(periodCosts.alerts).toHaveText("El importe debe ser un número.");
  await periodCosts.expectSubtotal("—");

  await authedPage.reload();
  await periodCosts.expectLoaded();

  await expect(periodCosts.lines).toHaveCount(0);
  await periodCosts.expectSubtotal("—");
});
