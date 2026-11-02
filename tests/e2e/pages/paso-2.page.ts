import { expect, type Locator, type Page } from "@playwright/test";

// Step 2 starts with the demo rows of the step (Alquiler, Servicios,
// Herramientas y suscripciones: $ 90.000,00 in total) until #176 persists them.
export class Paso2Page {
  readonly conceptInputs: Locator;
  readonly amountInputs: Locator;
  readonly addButton: Locator;
  readonly subtotal: Locator;
  readonly amountError: Locator;

  constructor(private readonly page: Page) {
    this.conceptInputs = page.getByLabel("Concepto", { exact: true });
    this.amountInputs = page.getByLabel("Importe", { exact: true });
    this.addButton = page.getByRole("button", { name: "Agregar concepto" });
    this.subtotal = page.getByLabel(/^Subtotal fijos /);
    this.amountError = page.getByRole("main").getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.page.goto("/paso-2");
    await expect(
      this.page.getByRole("heading", { name: "Costos fijos del mes", exact: true }),
    ).toBeVisible();
  }

  // Types an amount and leaves the field, as a user moving to the next one.
  async setAmount(row: number, amount: string): Promise<void> {
    const input = this.amountInputs.nth(row);
    await input.fill(amount);
    await input.blur();
  }

  async expectSubtotal(text: string): Promise<void> {
    await expect(this.subtotal).toHaveText(text);
  }
}
