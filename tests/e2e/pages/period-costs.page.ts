import { expect, type Locator, type Page } from "@playwright/test";

// The period expenses screen (#243) now follows the catalog pattern of
// Insumos and Productos (#285): a table, a search, a single modal for create
// and edit, and a confirmation before deleting a line.
export class PeriodCostsPage {
  readonly newButton: Locator;
  readonly search: Locator;
  readonly rows: Locator;
  readonly subtotal: Locator;
  readonly alerts: Locator;
  readonly dialog: Locator;

  constructor(private readonly page: Page) {
    this.newButton = page.getByRole("button", { name: "+ Nuevo" });
    this.search = page.getByLabel("Buscar");
    this.rows = page.getByRole("table").locator("tbody tr");
    this.subtotal = page.getByLabel(/^Total de gastos del período /);
    this.alerts = page.getByRole("alert");
    this.dialog = page.getByRole("dialog");
  }

  async goto(): Promise<void> {
    await this.page.goto("/period-costs");
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Gastos del período", exact: true }),
    ).toBeVisible();
  }

  async addLine(concept: string, amount: string): Promise<void> {
    await this.newButton.click();
    await this.fillAndSave(concept, amount);
  }

  async editLine(
    currentConcept: string,
    nextConcept: string,
    nextAmount: string,
  ): Promise<void> {
    await this.page
      .getByRole("button", { name: `Editar ${currentConcept}`, exact: true })
      .click();
    await expect(this.dialog).toBeVisible();
    await this.fillAndSave(nextConcept, nextAmount);
  }

  async deleteLine(concept: string): Promise<void> {
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.page
      .getByRole("button", { name: `Borrar ${concept}`, exact: true })
      .click();
  }

  async expectSubtotal(text: string): Promise<void> {
    await expect(this.subtotal).toHaveText(text);
  }

  private async fillAndSave(concept: string, amount: string): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await this.dialog.getByLabel("Concepto", { exact: true }).fill(concept);
    await this.dialog.getByLabel("Importe del mes", { exact: true }).fill(amount);
    await this.dialog.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(this.dialog).toHaveCount(0);
  }
}
