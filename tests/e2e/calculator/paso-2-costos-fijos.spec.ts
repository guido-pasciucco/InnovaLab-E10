import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";
import { Paso2Page } from "../pages/paso-2.page";

// Step 2 is only reachable once step 1 is saved, so every test goes through it.
const saved = { name: "Pan de avena", unit: "docena", volume: 96 };

test.beforeEach(async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);
});

test("the subtotal adds the amounts of the rows", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);

  await fixedCosts.expectSubtotal("$ 90.000,00");

  await fixedCosts.setAmount(0, "1.500,50");

  await expect(fixedCosts.amountInputs.nth(0)).toHaveValue("$ 1.500,50");
  await fixedCosts.expectSubtotal("$ 31.500,50");
});

test("adding a concept appends an empty row and focuses its name", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);

  await fixedCosts.addButton.click();

  await expect(fixedCosts.conceptInputs).toHaveCount(4);
  await expect(fixedCosts.conceptInputs.nth(3)).toBeFocused();
  await expect(fixedCosts.amountInputs.nth(3)).toHaveValue("");
  await fixedCosts.expectSubtotal("$ 90.000,00");
});

test("an invalid amount shows its error after leaving the field and is left out of the subtotal", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);

  await fixedCosts.amountInputs.nth(0).fill("abc");
  await expect(fixedCosts.amountError).toHaveCount(0);
  await fixedCosts.amountInputs.nth(0).blur();

  await expect(fixedCosts.amountError).toHaveText("El importe debe ser un número.");
  await fixedCosts.expectSubtotal("$ 30.000,00");

  await fixedCosts.setAmount(0, "60000");

  await expect(fixedCosts.amountError).toHaveCount(0);
  await fixedCosts.expectSubtotal("$ 90.000,00");
});

test("the subtotal shows a dash when no row has a valid amount", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);

  await fixedCosts.amountInputs.nth(0).fill("");
  await fixedCosts.amountInputs.nth(1).fill("1,234");
  await fixedCosts.amountInputs.nth(2).fill("");

  await fixedCosts.expectSubtotal("—");
});
