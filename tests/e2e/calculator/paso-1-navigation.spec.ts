import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";

const saved = { name: "Pan de avena", unit: "docena", volume: 96 };
const edited = { name: "Galletas de limón", unit: "caja", volume: 144 };

test("a successful save moves on to step 2", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();

  await setup.saveAndContinue(saved);
});

test("a server-rejected save keeps the user on step 1 and does not replace persisted data", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue(saved);
  await setup.goto();
  // Pass client validation, then exercise the real server validation error.
  await authedPage.route("**/paso-1", async (route) => {
    const request = route.request();
    if (request.method() !== "POST" || !request.headers()["next-action"]) {
      await route.continue();
      return;
    }
    const body = request.postData() ?? "";
    expect(body).toContain(JSON.stringify(edited.name));
    await route.continue({ postData: body.replace(JSON.stringify(edited.name), '""') });
  });

  try {
    await setup.save(edited);

    await expect(setup.fieldError).toHaveText("Escribí el nombre de tu producto.");
    await setup.expectStillOnStep1();
    await setup.expectValues(edited);
  } finally {
    // A test timeout may already have closed the context and its routes.
    if (!authedPage.isClosed()) {
      await authedPage.unrouteAll({ behavior: "wait" });
    }
  }
  await authedPage.reload();
  await setup.expectValues(saved);
});

test("edits typed while the save is pending are not persisted", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.fill(saved);
  let release!: () => void;
  let markIntercepted!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const intercepted = new Promise<void>((resolve) => { markIntercepted = resolve; });
  await authedPage.route("**/paso-1", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
      markIntercepted();
      await gate;
    }
    await route.continue();
  });

  const response = setup.waitForSaveResponse();
  try {
    await setup.saveButton.click();
    await intercepted;
    await expect(setup.nameInput).toBeDisabled();
    await setup.simulatePendingNameEdit(edited.name);
  } finally {
    release();
    await authedPage.unrouteAll({ behavior: "wait" });
  }
  await response;
  await setup.expectOnStep2();

  // The server saved what was submitted, not the late local edit.
  await setup.goto();
  await setup.expectValues(saved);
});

test("a successful save stores normalized values", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();

  await setup.saveAndContinue({ ...saved, name: `  ${saved.name}  `, unit: `  ${saved.unit}  ` });

  await setup.goto();
  await setup.expectValues(saved);
});

test("repeated submit events during a pending save send only one request", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.fill(saved);
  let release!: () => void;
  let markIntercepted!: () => void;
  let requests = 0;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const intercepted = new Promise<void>((resolve) => { markIntercepted = resolve; });
  await authedPage.route("**/paso-1", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
      requests++;
      markIntercepted();
      await gate;
    }
    await route.continue();
  });
  const response = setup.waitForSaveResponse();
  try {
    await setup.saveButton.click();
    await intercepted;
    await expect(setup.saveButton).toBeDisabled();
    // Bypass the disabled button to exercise the submit guard itself.
    await setup.submitAgainWhilePending();
  } finally {
    release();
    await authedPage.unrouteAll({ behavior: "wait" });
  }
  await response;
  await setup.expectOnStep2();

  expect(requests).toBe(1);
  await setup.goto();
  await setup.expectValues(saved);
});

test("an invalid form stays on step 1 and shows the error", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();

  await setup.fill({ ...saved, name: "" });
  await setup.saveButton.click();

  await expect(setup.fieldError.first()).toBeVisible();
  await setup.expectStillOnStep1();
});
