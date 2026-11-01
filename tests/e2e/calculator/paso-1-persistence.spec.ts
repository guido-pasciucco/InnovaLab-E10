import { expect, test } from "../fixtures";
import { Paso1Page, type Paso1Values } from "../pages/paso-1.page";

// Each test gets a different temporary user from the existing auth fixture.
// Its teardown deletes the user and their persisted calculator data.
const savedA: Paso1Values = { name: "Pan de avena", unit: "docena", volume: 96 };
const savedB: Paso1Values = { name: "Galletas de limón", unit: "caja", volume: 144 };

test("confirmed setup survives a page reload", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.save(savedA);

  await authedPage.reload();

  await setup.expectValues(savedA);
});

test("confirmed setup survives signing out and signing back in", async ({
  authedPage, user, dashboardPage, loginPage,
}) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.save(savedA);

  await dashboardPage.goto();
  await dashboardPage.signOut();
  await expect(authedPage).toHaveURL("/login");
  await loginPage.logIn(user);
  await expect(authedPage).toHaveURL("/");
  await setup.goto();

  await setup.expectValues(savedA);
});

test("unconfirmed edits do not replace the persisted setup after reload", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.save(savedA);

  await setup.fill(savedB);
  await authedPage.reload();

  await setup.expectValues(savedA);
});

test("the last confirmed setup replaces the previous one after reload", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.save(savedA);

  await setup.save(savedB);
  await authedPage.reload();

  await setup.expectValues(savedB);
});

test("the form stays disabled while the save request is pending", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.fill(savedA);
  let releaseRequest!: () => void;
  let requestIntercepted!: () => void;
  const gate = new Promise<void>((resolve) => { releaseRequest = resolve; });
  const intercepted = new Promise<void>((resolve) => { requestIntercepted = resolve; });
  // Hold only this page's Server Action, then let the real server persist it.
  // No response is mocked and no arbitrary delay controls the assertion.
  await authedPage.route("**/paso-1", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      requestIntercepted();
      await gate;
    }
    await route.continue();
  });

  const response = setup.waitForSaveResponse();
  try {
    await setup.saveButton.click();
    await intercepted;

    await expect(setup.saveButton).toHaveText("Guardando…");
    await expect(setup.saveButton).toBeDisabled();
    await expect(setup.nameInput).toBeDisabled();
    await expect(setup.unitInput).toBeDisabled();
    await expect(setup.volumeInput).toBeDisabled();
    await setup.expectValues(savedA);
  } finally {
    releaseRequest();
    await authedPage.unrouteAll({ behavior: "wait" });
  }

  await response;
  await expect(setup.saveButton).toBeEnabled();
  await authedPage.reload();
  await setup.expectValues(savedA);
});

// Keep the observed UI defect visible without preventing the persistence
// scenarios above from reaching their reload/sign-in assertions.
test("a successful save displays the confirmed setup", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();

  await setup.save(savedA);

  await setup.expectSaved(savedA);
});
