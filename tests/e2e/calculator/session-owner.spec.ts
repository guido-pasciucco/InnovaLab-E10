import { test, expect } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";

test("a session owner recovers the saved setup after reloading", async ({ authedPage }) => {
  const paso1 = new Paso1Page(authedPage);
  const values = { name: "Producto de sesión", unit: "caja", volume: 37 };

  await paso1.goto();
  await paso1.fill(values);

  const response = authedPage.waitForResponse(
    (res) => res.request().method() === "POST" && new URL(res.url()).pathname === "/paso-1",
  );
  await paso1.saveButton.click();
  await response;
  await expect(paso1.saveButton).toBeEnabled();
  await authedPage.reload();

  await paso1.expectValues(values);
});

test("a visitor without a session cannot open calculator setup", async ({ page }) => {
  await page.goto("/paso-1");

  await expect(page).toHaveURL("/login");
});
