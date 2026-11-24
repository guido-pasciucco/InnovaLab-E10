import { expect, test } from "../fixtures";

// Regression for the QA finding in #260/#263: typing "20000.50" character by
// character in the real form must keep the intended integer digits. Formatting
// through React state alone could race with fast typing and turn it into
// "2.000,50"; the parser-only tests did not catch that.
test("formatea el precio de compra al tipearlo carácter por carácter", async ({ authedPage }) => {
  await authedPage.goto("/supplies");

  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  await expect(authedPage.getByRole("dialog")).toBeVisible();

  const purchasePrice = authedPage.getByRole("textbox", { name: "Precio de compra" });
  await purchasePrice.click();
  await purchasePrice.pressSequentially("20000.50");

  await expect(purchasePrice).toHaveValue("20.000,50");
});
