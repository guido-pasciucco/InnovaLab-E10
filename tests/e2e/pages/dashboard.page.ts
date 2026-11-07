import type { Locator, Page } from "@playwright/test";

export class DashboardPage {
  readonly heading: Locator;
  readonly signOutButton: Locator;
  readonly newCalculationButton: Locator;
  readonly emptyState: Locator;
  readonly cards: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Dashboard" });
    this.signOutButton = page.getByRole("button", { name: "Sign out" });
    this.newCalculationButton = page.getByRole("button", { name: "Nuevo cálculo" });
    this.emptyState = page.getByText("Todavía no tenés cálculos");
    this.cards = page.getByRole("listitem");
  }

  async goto(): Promise<void> {
    await this.page.goto("/dashboard");
  }

  userEmail(email: string): Locator {
    return this.page.getByText(email);
  }

  // Card of the calculation with this product name.
  card(productName: string): Locator {
    return this.cards.filter({ hasText: productName });
  }

  async continueCalculation(productName: string): Promise<void> {
    await this.card(productName).getByRole("button", { name: "Continuar cálculo" }).click();
  }

  async signOut(): Promise<void> {
    await this.signOutButton.click();
  }
}
