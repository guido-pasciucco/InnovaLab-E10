import { expect, type Locator, type Page } from "@playwright/test";

// Step 2 lists the fixed costs saved in the draft. Every row, saved or being
// added, has a concept input, an amount input and a delete button named after
// its concept. The row being added is always the last one.
export class Paso2Page {
  readonly lines: Locator;
  readonly conceptInputs: Locator;
  readonly newConceptInput: Locator;
  readonly newRowDeleteButton: Locator;
  readonly amountInputs: Locator;
  readonly addButton: Locator;
  readonly subtotal: Locator;
  readonly alerts: Locator;

  constructor(private readonly page: Page) {
    this.lines = page.getByRole("list", { name: "Costos fijos del mes" }).getByRole("listitem");
    this.conceptInputs = page.getByLabel("Concepto", { exact: true });
    this.newConceptInput = this.conceptInputs.last();
    this.newRowDeleteButton = page.getByRole("button", { name: "Eliminar fila", exact: true });
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
    await this.openNewRow(count);
    await this.newConceptInput.fill(concept);
    await this.amountInputs.nth(count).fill(amount);
    const saved = this.waitForAction();
    await this.amountInputs.nth(count).blur();
    await saved;
    // The saved line is the one whose delete button carries its concept: until
    // then the new row may still be on screen.
    await expect(this.deleteButton(concept)).toBeVisible();
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

  // Opens a new row and waits for it: the new row is the last concept input,
  // so filling before it exists would type into the previous row.
  async openNewRow(savedCount: number): Promise<void> {
    await this.addButton.click();
    await expect(this.conceptInputs).toHaveCount(savedCount + 1);
  }

  // Types a new concept on a saved line and leaves the field.
  async editConcept(row: number, concept: string): Promise<void> {
    const input = this.conceptInputs.nth(row);
    await input.fill(concept);
    const saved = this.waitForAction();
    await input.blur();
    await saved;
  }

  deleteButton(concept: string): Locator {
    return this.page.getByRole("button", { name: `Eliminar ${concept}`, exact: true });
  }

  // Deletes a saved line and waits for the server to answer.
  async deleteLine(concept: string): Promise<void> {
    const deleted = this.waitForAction();
    await this.deleteButton(concept).click();
    await deleted;
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
