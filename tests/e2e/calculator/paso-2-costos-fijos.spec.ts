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

test("a draft without costs shows an empty table and a dash as subtotal", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);

  await expect(fixedCosts.lines).toHaveCount(0);
  await fixedCosts.expectSubtotal("—");
});

test("a new line is saved, summed by the server and survives a reload", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);

  await fixedCosts.addLine("Alquiler", "60.000");

  await fixedCosts.expectSubtotal("$60.000");
  await expect(fixedCosts.amountInputs.nth(0)).toHaveValue("$60.000");

  await authedPage.reload();
  await fixedCosts.expectLoaded();

  await expect(fixedCosts.lines).toHaveCount(1);
  await expect(fixedCosts.conceptInputs.nth(0)).toHaveValue("Alquiler");
  await expect(fixedCosts.amountInputs.nth(0)).toHaveValue("$60.000");
  await fixedCosts.expectSubtotal("$60.000");
});

test("two lines add up in the subtotal", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);

  await fixedCosts.addLine("Alquiler", "60000");
  await fixedCosts.addLine("Servicios", "1.500,50");

  await fixedCosts.expectSubtotal("$61.500,50");
  await authedPage.reload();
  await fixedCosts.expectLoaded();
  await expect(fixedCosts.lines).toHaveCount(2);
  await fixedCosts.expectSubtotal("$61.500,50");
});

test("editing the amount of a saved line updates the subtotal after a reload", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);
  await fixedCosts.addLine("Alquiler", "60000");

  await fixedCosts.editAmount(0, "75.000,25");

  await fixedCosts.expectSubtotal("$75.000,25");
  await authedPage.reload();
  await fixedCosts.expectLoaded();
  await expect(fixedCosts.lines).toHaveCount(1);
  await expect(fixedCosts.amountInputs.nth(0)).toHaveValue("$75.000,25");
  await fixedCosts.expectSubtotal("$75.000,25");
});

test("an invalid amount shows its error after leaving the field and is not saved", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);

  await fixedCosts.addButton.click();
  await fixedCosts.newConceptInput.fill("Alquiler");
  await fixedCosts.amountInputs.nth(0).fill("abc");
  await expect(fixedCosts.alerts).toHaveCount(0);
  await fixedCosts.amountInputs.nth(0).blur();

  await expect(fixedCosts.alerts).toHaveText("El importe debe ser un número.");
  await fixedCosts.expectSubtotal("—");

  await authedPage.reload();
  await fixedCosts.expectLoaded();
  await expect(fixedCosts.lines).toHaveCount(0);
  await fixedCosts.expectSubtotal("—");
});

test("an invalid edit of a saved line keeps the stored amount in the subtotal", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);
  await fixedCosts.addLine("Alquiler", "60000");

  await fixedCosts.amountInputs.nth(0).fill("1,234");
  await fixedCosts.amountInputs.nth(0).blur();

  await expect(fixedCosts.alerts).toHaveCount(1);
  await fixedCosts.expectSubtotal("$60.000");
  await authedPage.reload();
  await fixedCosts.expectLoaded();
  await fixedCosts.expectSubtotal("$60.000");
});

test("a new row without a concept is not saved and asks for it", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);

  await fixedCosts.addButton.click();
  await fixedCosts.amountInputs.nth(0).fill("500");
  await fixedCosts.amountInputs.nth(0).blur();

  await expect(fixedCosts.alerts).toHaveText("Escribí el concepto del costo.");
  await fixedCosts.expectSubtotal("—");
});

test("adding a concept opens a row and focuses its concept input", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);

  await fixedCosts.addButton.click();

  await expect(fixedCosts.newConceptInput).toBeFocused();
  await expect(fixedCosts.amountInputs.nth(0)).toHaveValue("");
  await fixedCosts.expectSubtotal("—");
});

test("editing the concept of a saved line persists after a reload and keeps the amount", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);
  await fixedCosts.addLine("Alquiler", "60000");

  await fixedCosts.editConcept(0, "Alquiler del local");

  await expect(fixedCosts.alerts).toHaveCount(0);
  await authedPage.reload();
  await fixedCosts.expectLoaded();
  await expect(fixedCosts.lines).toHaveCount(1);
  await expect(fixedCosts.conceptInputs.nth(0)).toHaveValue("Alquiler del local");
  await expect(fixedCosts.amountInputs.nth(0)).toHaveValue("$60.000");
  await fixedCosts.expectSubtotal("$60.000");
});

test("an empty concept on a saved line shows its error and is not saved", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);
  await fixedCosts.addLine("Alquiler", "60000");

  await fixedCosts.conceptInputs.nth(0).fill("");
  await expect(fixedCosts.alerts).toHaveCount(0);
  await fixedCosts.conceptInputs.nth(0).blur();

  await expect(fixedCosts.alerts).toHaveText("Escribí el concepto del costo.");
  await authedPage.reload();
  await fixedCosts.expectLoaded();
  await expect(fixedCosts.conceptInputs.nth(0)).toHaveValue("Alquiler");
  await fixedCosts.expectSubtotal("$60.000");
});

test("changing the concept and the amount of a saved line saves both", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);
  await fixedCosts.addLine("Alquiler", "60000");

  await fixedCosts.conceptInputs.nth(0).fill("Alquiler del local");
  await fixedCosts.amountInputs.nth(0).fill("70000");
  await fixedCosts.amountInputs.nth(0).blur();

  await fixedCosts.expectSubtotal("$70.000");
  await expect(fixedCosts.alerts).toHaveCount(0);
  await authedPage.reload();
  await fixedCosts.expectLoaded();
  await expect(fixedCosts.conceptInputs.nth(0)).toHaveValue("Alquiler del local");
  await expect(fixedCosts.amountInputs.nth(0)).toHaveValue("$70.000");
});

test("deleting a saved line removes it and updates the subtotal after a reload", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);
  await fixedCosts.addLine("Alquiler", "60000");
  await fixedCosts.addLine("Servicios", "1.500,50");

  await fixedCosts.deleteLine("Alquiler");

  await expect(fixedCosts.lines).toHaveCount(1);
  await fixedCosts.expectSubtotal("$1.500,50");
  await authedPage.reload();
  await fixedCosts.expectLoaded();
  await expect(fixedCosts.lines).toHaveCount(1);
  await expect(fixedCosts.conceptInputs.nth(0)).toHaveValue("Servicios");
  await fixedCosts.expectSubtotal("$1.500,50");
});

test("deleting the last line returns to the empty table and a dash as subtotal", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);
  await fixedCosts.addLine("Alquiler", "60000");

  await fixedCosts.deleteLine("Alquiler");

  await expect(fixedCosts.lines).toHaveCount(0);
  await fixedCosts.expectSubtotal("—");
  await expect(fixedCosts.addButton).toBeFocused();
  await authedPage.reload();
  await fixedCosts.expectLoaded();
  await expect(fixedCosts.lines).toHaveCount(0);
  await fixedCosts.expectSubtotal("—");
});

test("discarding a new row creates nothing, even with a valid concept and amount", async ({ authedPage }) => {
  const fixedCosts = new Paso2Page(authedPage);

  await fixedCosts.addButton.click();
  await fixedCosts.newConceptInput.fill("Alquiler");
  await fixedCosts.amountInputs.nth(0).fill("60000");
  await fixedCosts.newRowDeleteButton.click();

  await expect(fixedCosts.lines).toHaveCount(0);
  await expect(fixedCosts.alerts).toHaveCount(0);
  await expect(fixedCosts.addButton).toBeFocused();
  await fixedCosts.expectSubtotal("—");
  await authedPage.reload();
  await fixedCosts.expectLoaded();
  await expect(fixedCosts.lines).toHaveCount(0);
  await fixedCosts.expectSubtotal("—");
});
