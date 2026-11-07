import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";
import { Paso2Page } from "../pages/paso-2.page";
import { Paso4Page } from "../pages/paso-4.page";

// Step 4 is reachable once "Siguiente" unlocked it on steps 2 and 3.
test("own labor and an indirect concept reach the unit cost, stay out of step 2 and unlock step 5", async ({
  authedPage,
}) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue({ name: "Vela de soja", unit: "unidad", volume: 200 });
  await new Paso2Page(authedPage).addLine("Alquiler", "90.000");
  const next = authedPage.getByRole("button", { name: "Siguiente", exact: true });
  await next.click();
  await expect(authedPage).toHaveURL(/\/paso-3$/);
  await next.click();
  await expect(authedPage).toHaveURL(/\/paso-4$/);

  const ownLabor = new Paso4Page(authedPage);
  await ownLabor.expectLoaded();
  await expect(ownLabor.indirectLines).toHaveCount(0);

  await ownLabor.saveOwnLabor("80", "2500");
  await expect(ownLabor.ownLaborAmount).toHaveText("$200.000");

  await ownLabor.addIndirectLine("Publicidad", "30.000");
  await expect(ownLabor.subtotal).toHaveText("$30.000");
  // (90.000 + 200.000 + 30.000) / 200 units
  await expect(ownLabor.unitCost).toContainText("$1.600");

  await authedPage.reload();
  await ownLabor.expectLoaded();
  await expect(ownLabor.hoursInput).toHaveValue("80");
  await expect(ownLabor.rateInput).toHaveValue("$2.500");

  // The fixed step lists only its own line.
  await authedPage.goto("/paso-2");
  const fixedCosts = new Paso2Page(authedPage);
  await fixedCosts.expectLoaded();
  await expect(fixedCosts.lines).toHaveCount(1);
  await expect(fixedCosts.conceptInputs.nth(0)).toHaveValue("Alquiler");

  await authedPage.goto("/paso-4");
  // "Siguiente" opens step 5.
  await ownLabor.nextButton.click();
  await expect(authedPage).toHaveURL(/\/paso-5$/);
});
