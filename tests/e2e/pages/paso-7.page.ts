import { expect, type Locator, type Page } from "@playwright/test";

// Step 7 has a comparison table (one column per scenario, one row per
// figure), one form per alternative named "Editar <name>", and the inflation
// box. Cells are read by the row header and the column header.
export class Paso7Page {
  readonly table: Locator;
  readonly duplicate: Locator;
  readonly previous: Locator;
  readonly newCalculation: Locator;
  readonly increaseInput: Locator;
  readonly inflation: Locator;

  constructor(private readonly page: Page) {
    this.table = page.getByRole("table", { name: "Comparación de escenarios contra la base" });
    this.duplicate = page.getByRole("button", { name: "Duplicar escenario", exact: true });
    this.previous = page.getByRole("link", { name: "Anterior", exact: true });
    this.newCalculation = page.getByRole("button", { name: "Nuevo cálculo", exact: true });
    this.increaseInput = page.getByLabel("Aumento esperado de tus costos variables (%)", {
      exact: true,
    });
    this.inflation = page.getByRole("region", { name: "Ajuste por inflación" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/paso-7");
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Comparar escenarios", exact: true }),
    ).toBeVisible();
  }

  columnHeaders(): Locator {
    return this.table.getByRole("columnheader");
  }

  // The cell of `row` ("Precio") under the scenario at `column` (0 = base).
  cell(row: string, column: number): Locator {
    return this.table
      .getByRole("row", { name: new RegExp(`^${row}`) })
      .getByRole("cell")
      .nth(column);
  }

  editor(name: string): Locator {
    return this.page.getByRole("form", { name: `Editar ${name}`, exact: true });
  }

  // Duplicates the base and waits for the new column.
  async duplicateBase(): Promise<void> {
    const columns = await this.columnHeaders().count();
    await this.duplicate.click();
    await expect(this.columnHeaders()).toHaveCount(columns + 1);
  }

  async editScenario(
    name: string,
    values: { name?: string; price?: string; volume?: string },
  ): Promise<void> {
    const editor = this.editor(name);
    if (values.name !== undefined) {
      await editor.getByLabel("Nombre del escenario", { exact: true }).fill(values.name);
    }
    if (values.price !== undefined) {
      await editor.getByLabel("Precio de venta", { exact: true }).fill(values.price);
    }
    if (values.volume !== undefined) {
      await editor.getByLabel("Unidades del mes", { exact: true }).fill(values.volume);
    }
    await editor.getByRole("button", { name: "Guardar escenario", exact: true }).click();
  }
}
