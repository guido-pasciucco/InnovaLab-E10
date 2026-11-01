import { expect, type Locator, type Page } from "@playwright/test";

export type Paso1Values = { name: string; unit: string; volume: number };

export class Paso1Page {
  readonly nameInput: Locator;
  readonly unitInput: Locator;
  readonly volumeInput: Locator;
  readonly saveButton: Locator;
  readonly confirmation: Locator;
  readonly fieldError: Locator;

  constructor(private readonly page: Page) {
    this.nameInput = page.getByLabel("Nombre del producto", { exact: true });
    this.unitInput = page.getByLabel("Unidad", { exact: true });
    this.volumeInput = page.getByLabel("Volumen", { exact: true });
    this.saveButton = page.getByRole("button", {
      name: /^(Guardar|Guardando…)$/,
    });
    this.confirmation = page.getByRole("main").getByRole("status");
    this.fieldError = page.getByRole("main").getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.page.goto("/paso-1");
    await expect(
      this.page.getByRole("heading", { name: "Configuración", exact: true }),
    ).toBeVisible();
  }

  async fill(values: Paso1Values): Promise<void> {
    await this.nameInput.fill(values.name);
    await this.unitInput.fill(values.unit);
    await this.volumeInput.fill(String(values.volume));
  }

  async expectValues(values: Paso1Values): Promise<void> {
    await expect(this.nameInput).toHaveValue(values.name);
    await expect(this.unitInput).toHaveValue(values.unit);
    await expect(this.volumeInput).toHaveValue(String(values.volume));
  }

  async expectSaved(values: Paso1Values): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
    await expect(this.confirmation).toContainText("Guardado");
    await expect(this.confirmation).toContainText(
      `Vamos a calcular el costo de ${values.name} en ${values.unit}, con un volumen de ${values.volume} por mes.`,
    );
  }

  async save(values: Paso1Values): Promise<void> {
    await this.fill(values);
    const response = this.waitForSaveResponse();
    await this.saveButton.click();
    await response;
    await expect(this.saveButton).toBeEnabled();
  }

  async waitForSaveResponse(): Promise<void> {
    const response = await this.page.waitForResponse((response) => {
      const request = response.request();
      return (
        new URL(response.url()).pathname === "/paso-1" &&
        request.method() === "POST" &&
        Boolean(request.headers()["next-action"])
      );
    });
    expect(response.ok()).toBe(true);
    // Server Actions stream their result. Wait for the form to finish its
    // transition instead of transport EOF; callers assert the business result.
    await expect(this.saveButton).toBeEnabled();
  }

  // Defensive regression: simulate a programmatic edit despite disabled UI.
  // This is not a normal user interaction while a save is pending.
  async simulatePendingNameEdit(name: string): Promise<void> {
    await this.nameInput.evaluate((input: HTMLInputElement) => {
      input.disabled = false;
    });
    await this.nameInput.fill(name);
  }

  async submitAgainWhilePending(): Promise<void> {
    await this.saveButton.evaluate((button: HTMLButtonElement) => {
      button.form?.requestSubmit();
      button.form?.requestSubmit();
    });
  }
}
