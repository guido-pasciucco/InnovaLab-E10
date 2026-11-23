import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";

import { createLinkedSupplier, createSupply } from "../../tests/support/factories/tender";
import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { deleteSupplyService } from "./supplies";
import { discardTenderDraftService, hasTenderDraftService, saveTenderDraftService } from "./tender-drafts";
import { getTenderFormDataService, publishTenderService } from "./tenders";

// Integration tests for tender drafts: the emprendedor loads the supplies to
// publish before having suppliers, saves them, and publishes later.

let db: Db;
const users: CreatedUser[] = [];
const track = (user: CreatedUser) => users.push(user);

beforeAll(() => {
  process.env.DATABASE_URL = loadTestEnv().DATABASE_URL;
  globalThis.__drizzleClient = undefined;
  db = getDrizzleClient();
});

afterAll(async () => {
  try {
    if (db) await db.$client.end();
  } finally {
    globalThis.__drizzleClient = undefined;
  }
});

afterEach(async () => {
  const results = await Promise.allSettled(users.map((user) => deleteUser(user.id)));
  users.length = 0;
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) throw new AggregateError(failures.map((f) => f.reason), "cleanup failed");
});

async function makeUser(): Promise<CreatedUser> {
  const user = await createUser();
  track(user);
  return user;
}

async function expectAppError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (err: unknown) => err,
  );
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).code).toBe(code);
}

function draftInput(supplyId: string, overrides: Record<string, unknown> = {}) {
  return {
    roundHours: "12",
    roundCount: "3",
    decrementPercent: "10",
    items: [{ supplyId, quantity: "40", specs: "Marca indistinta", startingPrice: "700" }],
    excludedSupplierIds: [],
    ...overrides,
  };
}

describe("saveTenderDraftService", () => {
  it("saves a draft without any linked supplier and returns it with the form data", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);

    await saveTenderDraftService(owner.id, draftInput(flour.id), db);

    const data = await getTenderFormDataService(owner.id, db);
    expect(data.suppliers).toEqual([]);
    expect(data.draft).toEqual({
      roundHours: "12",
      roundCount: "3",
      decrementPercent: "10",
      items: [{ supplyId: flour.id, quantity: "40", specs: "Marca indistinta", startingPrice: "700" }],
      excludedSupplierIds: [],
    });
  });

  it("keeps half-filled values: a draft does not need to be publishable", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);

    await saveTenderDraftService(
      owner.id,
      draftInput(flour.id, {
        decrementPercent: "",
        items: [{ supplyId: flour.id, quantity: "", specs: "", startingPrice: "" }],
      }),
      db,
    );

    const { draft } = await getTenderFormDataService(owner.id, db);
    expect(draft?.decrementPercent).toBe("");
    expect(draft?.items).toEqual([{ supplyId: flour.id, quantity: "", specs: "", startingPrice: "" }]);
  });

  it("replaces the previous draft: there is one per emprendedor", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const sugar = await createSupply(owner.id, "Azúcar", db);

    await saveTenderDraftService(owner.id, draftInput(flour.id), db);
    await saveTenderDraftService(
      owner.id,
      draftInput(sugar.id, { items: [{ supplyId: sugar.id, quantity: "5", specs: "", startingPrice: "900" }] }),
      db,
    );

    const { draft } = await getTenderFormDataService(owner.id, db);
    expect(draft?.items.map((item) => item.supplyId)).toEqual([sugar.id]);
  });

  it("needs at least one supply", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);

    await expect(saveTenderDraftService(owner.id, draftInput(flour.id, { items: [] }), db)).rejects.toBeInstanceOf(
      ZodError,
    );
    expect((await getTenderFormDataService(owner.id, db)).draft).toBeNull();
  });

  it("rejects a supply from another emprendedor's catalog", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const foreign = await createSupply(other.id, "Harina ajena", db);

    await expectAppError(saveTenderDraftService(owner.id, draftInput(foreign.id), db), "TENDER_SUPPLY_NOT_FOUND");
  });

  it("is private to its emprendedor", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);

    await saveTenderDraftService(owner.id, draftInput(flour.id), db);

    expect((await getTenderFormDataService(other.id, db)).draft).toBeNull();
  });
});

describe("loading a draft", () => {
  it("drops supplies that were deleted from the catalog after saving", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const sugar = await createSupply(owner.id, "Azúcar", db);
    await saveTenderDraftService(
      owner.id,
      draftInput(flour.id, {
        items: [
          { supplyId: flour.id, quantity: "40", specs: "", startingPrice: "700" },
          { supplyId: sugar.id, quantity: "5", specs: "", startingPrice: "900" },
        ],
      }),
      db,
    );

    await deleteSupplyService(owner.id, sugar.id, db);

    const { draft } = await getTenderFormDataService(owner.id, db);
    expect(draft?.items.map((item) => item.supplyId)).toEqual([flour.id]);
  });

  it("tells whether the emprendedor has a draft, for the tender list", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    expect(await hasTenderDraftService(owner.id, db)).toBe(false);

    await saveTenderDraftService(owner.id, draftInput(flour.id), db);

    expect(await hasTenderDraftService(owner.id, db)).toBe(true);
  });
});

describe("discardTenderDraftService", () => {
  it("deletes the draft", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    await saveTenderDraftService(owner.id, draftInput(flour.id), db);

    await discardTenderDraftService(owner.id, db);

    expect((await getTenderFormDataService(owner.id, db)).draft).toBeNull();
  });
});

describe("publishing a draft", () => {
  it("deletes the draft once the tender is published", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    await saveTenderDraftService(owner.id, draftInput(flour.id), db);
    const molino = await createLinkedSupplier(owner, db, track);

    await publishTenderService(
      owner.id,
      {
        roundHours: "12",
        roundCount: "3",
        decrementPercent: "10",
        items: [{ supplyId: flour.id, quantity: "40", specs: "", startingPrice: "700" }],
        supplierIds: [molino.id],
      },
      db,
    );

    expect((await getTenderFormDataService(owner.id, db)).draft).toBeNull();
  });

  it("keeps the draft when publishing fails", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    await saveTenderDraftService(owner.id, draftInput(flour.id), db);
    const other = await makeUser();
    const foreign = await createLinkedSupplier(other, db, track);

    await expectAppError(
      publishTenderService(
        owner.id,
        {
          roundHours: "12",
          roundCount: "3",
          decrementPercent: "10",
          items: [{ supplyId: flour.id, quantity: "40", specs: "", startingPrice: "700" }],
          supplierIds: [foreign.id],
        },
        db,
      ),
      "TENDER_SUPPLIER_NOT_LINKED",
    );

    expect((await getTenderFormDataService(owner.id, db)).draft).not.toBeNull();
  });
});
