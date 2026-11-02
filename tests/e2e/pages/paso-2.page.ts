import { expect, type Locator, type Page } from "@playwright/test";

// Step 2 lists the fixed costs saved in the draft. A saved line shows its
// concept as text; only the row being added has a concept input.
export class Paso2Page {
  readonly lines: Locator;
  readonly newConceptInput: Locator;
  readonly amountInputs: Locator;
  readonly addButton: Locator;
  readonly subtotal: Locator;
  readonly alerts: Locator;

  constructor(private readonly page: Page) {
    this.lines = page.getByRole("list", { name: "Costos fijos del mes" }).getByRole("listitem");
    this.newConceptInput = page.getByLabel("Concepto", { exact: true });
    this.amountInputs = page.getByLabel("Importe", { exact: true });
    this.addButton = page.getByRole("button", { name: "Agregar concepto" });
    this.subtotal = page.getByLabel(/^Subtotal fijos /);
    this.alerts = page.getByRole("main").getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.page.goto("/paso-2");
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Costos fijos del mes", exact: true }),
    ).toBeVisible();
  }

  // Opens a new row, fills it and leaves it, as a user moving on. Waits for
  // the server to answer so the next assertion reads the saved state.
  async addLine(concept: string, amount: string): Promise<void> {
    const count = await this.lines.count();
    await this.addButton.click();
    await this.newConceptInput.fill(concept);
    await this.amountInputs.nth(count).fill(amount);
    const saved = this.waitForAction();
    await this.amountInputs.nth(count).blur();
    await saved;
    await expect(this.lines).toHaveCount(count + 1);
  }

  // Types a new amount on a saved line and leaves the field.
  async editAmount(row: number, amount: string): Promise<void> {
    const input = this.amountInputs.nth(row);
    await input.fill(amount);
    const saved = this.waitForAction();
    await input.blur();
    await saved;
  }

  async expectSubtotal(text: string): Promise<void> {
    await expect(this.subtotal).toHaveText(text);
  }

  private async waitForAction(): Promise<void> {
    const response = await this.page.waitForResponse((response) => {
      const request = response.request();
      return (
        new URL(response.url()).pathname === "/paso-2" &&
        request.method() === "POST" &&
        Boolean(request.headers()["next-action"])
      );
    });
    expect(response.ok()).toBe(true);
  }
}
