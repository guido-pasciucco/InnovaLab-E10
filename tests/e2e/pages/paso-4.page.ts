import { expect, type Locator, type Page } from "@playwright/test";

// Step 4 has the own-labor inputs (saved together when focus leaves them) and
// the indirect concepts table, which reuses the row locators of step 2.
export class Paso4Page {
  readonly hoursInput: Locator;
  readonly rateInput: Locator;
  readonly ownLaborAmount: Locator;
  readonly indirectLines: Locator;
  readonly conceptInputs: Locator;
  readonly amountInputs: Locator;
  readonly addButton: Locator;
  readonly subtotal: Locator;
  readonly unitCost: Locator;
  readonly nextButton: Locator;

  constructor(private readonly page: Page) {
    this.hoursInput = page.getByLabel("Horas del mes", { exact: true });
    this.rateInput = page.getByLabel("Valor por hora", { exact: true });
    this.ownLaborAmount = page.getByText("Trabajo propio", { exact: true }).locator("xpath=following-sibling::span");
    this.indirectLines = page.getByRole("list", { name: "Costos indirectos" }).getByRole("listitem");
    this.conceptInputs = page.getByLabel("Concepto", { exact: true });
    this.amountInputs = page.getByLabel("Importe", { exact: true });
    this.addButton = page.getByRole("button", { name: "Agregar concepto" });
    this.subtotal = page.getByLabel(/^Subtotal indirectos /);
    this.unitCost = page.getByRole("group", { name: "Costo unitario", exact: true });
    this.nextButton = page.getByRole("button", { name: "Siguiente", exact: true });
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Trabajo propio e indirectos", exact: true }),
    ).toBeVisible();
  }

  // Types both values and leaves the group, as a user moving on. Waits for the
  // server to answer so the next assertion reads the saved state.
  async saveOwnLabor(hours: string, hourlyRate: string): Promise<void> {
    await this.hoursInput.fill(hours);
    await this.rateInput.fill(hourlyRate);
    const saved = this.waitForAction();
    await this.rateInput.blur();
    await saved;
  }

  async addIndirectLine(concept: string, amount: string): Promise<void> {
    const count = await this.indirectLines.count();
    await this.addButton.click();
    await expect(this.conceptInputs).toHaveCount(count + 1);
    await this.conceptInputs.last().fill(concept);
    await this.amountInputs.nth(count).fill(amount);
    const saved = this.waitForAction();
    await this.amountInputs.nth(count).blur();
    await saved;
    await expect(this.page.getByRole("button", { name: `Eliminar ${concept}`, exact: true })).toBeVisible();
  }

  private async waitForAction(): Promise<void> {
    const response = await this.page.waitForResponse((response) => {
      const request = response.request();
      return (
        new URL(response.url()).pathname === "/paso-4" &&
        request.method() === "POST" &&
        Boolean(request.headers()["next-action"])
      );
    });
    expect(response.ok()).toBe(true);
  }
}
