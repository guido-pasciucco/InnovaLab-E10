import { expect, type Locator, type Page } from "@playwright/test";

// Step 5 has one margin field and four cards, each a group named after its
// label ("Precio sugerido") that holds the formatted amount.
export class Paso5Page {
  readonly marginInput: Locator;
  readonly next: Locator;
  readonly previous: Locator;
  readonly alerts: Locator;

  constructor(private readonly page: Page) {
    this.marginInput = page.getByLabel("Margen esperado (%)", { exact: true });
    this.next = page.getByRole("button", { name: "Siguiente", exact: true });
    this.previous = page.getByRole("link", { name: "Anterior", exact: true });
    this.alerts = page.getByRole("main").getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.page.goto("/paso-5");
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Margen y precio sugerido", exact: true }),
    ).toBeVisible();
  }

  card(label: string): Locator {
    return this.page.getByRole("group", { name: label, exact: true });
  }

  async expectCard(label: string, amount: string): Promise<void> {
    await expect(this.card(label)).toContainText(amount);
  }

  // Types a margin and leaves the field, waiting for the save to answer.
  async saveMargin(margin: string): Promise<void> {
    await this.marginInput.fill(margin);
    const saved = this.page.waitForResponse((response) => {
      const request = response.request();
      return (
        new URL(response.url()).pathname === "/paso-5" &&
        request.method() === "POST" &&
        Boolean(request.headers()["next-action"])
      );
    });
    await this.marginInput.blur();
    expect((await saved).ok()).toBe(true);
  }
}
