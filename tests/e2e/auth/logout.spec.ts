import { expect, test } from "../fixtures";

test("signing out from the flow 1 sidebar ends the session", async ({ authedPage }) => {
  // Arrange
  await authedPage.goto("/supplies");
  const profile = authedPage.getByRole("region", { name: "Perfil" });

  // Act
  await profile.getByRole("button", { name: "Sign out" }).click();

  // Assert: back on /login, and the protected page now bounces there too.
  await expect(authedPage).toHaveURL("/login");
  await authedPage.goto("/supplies");
  await expect(authedPage).toHaveURL("/login");
});
