import type { Locator, Page } from "@playwright/test";

export class DashboardPage {
  readonly heading: Locator;
  readonly signOutButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Dashboard" });
    this.signOutButton = page.getByRole("button", { name: "Sign out" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/dashboard");
  }

  userEmail(email: string): Locator {
    return this.page.getByText(email);
  }

  async signOut(): Promise<void> {
    await this.signOutButton.click();
  }
}
