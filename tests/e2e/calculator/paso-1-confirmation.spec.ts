import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";

const saved = { name: "Pan de avena", unit: "docena", volume: 96 };
const edited = { name: "Galletas de limón", unit: "caja", volume: 144 };

test("editing a saved setup hides its confirmation until the next successful save", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.save(saved);
  await setup.expectSaved(saved);

  await setup.fill(edited);

  await expect(setup.confirmation).toHaveCount(0);
  await setup.save(edited);
  await setup.expectSaved(edited);
});

test("a server-rejected save does not show the previous success or replace persisted data", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.save(saved);
  await setup.expectSaved(saved);
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
    await expect(setup.confirmation).toHaveCount(0);
    await setup.expectValues(edited);
  } finally {
    await authedPage.unrouteAll({ behavior: "wait" });
  }
  await authedPage.reload();
  await setup.expectValues(saved);
});

test("a save response preserves local edits made after its request", async ({ authedPage }) => {
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
  await expect(setup.saveButton).toBeEnabled();

  await setup.expectValues({ ...saved, name: edited.name });
  await expect(setup.confirmation).toHaveCount(0);
  await authedPage.reload();
  await setup.expectValues(saved);
});

test("a successful save confirms normalized values without treating them as later edits", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();

  await setup.save({ ...saved, name: `  ${saved.name}  `, unit: `  ${saved.unit}  ` });

  await setup.expectSaved(saved);
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
  await setup.expectSaved(saved);

  expect(requests).toBe(1);
  await authedPage.reload();
  await setup.expectValues(saved);
});
