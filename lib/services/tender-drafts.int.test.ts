import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";
import type { VerifiedUserId } from "@/lib/services/auth";

import { createLinkedSupplier, createSupply } from "../../tests/support/factories/tender";
import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { deleteSupplyService } from "./supplies";
import {
  discardTenderDraftService,
  listTenderDraftsService,
  saveTenderDraftService,
  type TenderDraft,
} from "./tender-drafts";
import { getTenderFormDataService, listTendersService, publishTenderService } from "./tenders";

// Integration tests for tender drafts (N-31): the emprendedor keeps several
// half-filled publish forms, chooses which one to continue, and publishing or
// discarding only affects that one.

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

function publishInput(supplyId: string, supplierId: string, draftId?: string) {
  return {
    roundHours: "12",
    roundCount: "3",
    decrementPercent: "10",
    items: [{ supplyId, quantity: "40", specs: "", startingPrice: "700" }],
    supplierIds: [supplierId],
    draftId,
  };
}

// Saves a brand-new draft; updates pass an explicit id to the service.
function save(userId: VerifiedUserId, input: ReturnType<typeof draftInput>) {
  return saveTenderDraftService(userId, input, null, db);
}

function load(userId: VerifiedUserId, draftId: string) {
  return getTenderFormDataService(userId, draftId, db);
}

describe("saveTenderDraftService", () => {
  it("creates a numbered draft and returns it with the form data", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);

    const draft = await save(owner.id, draftInput(flour.id));

    expect(draft).toMatchObject({
      id: expect.any(String),
      number: 1,
      roundHours: "12",
      roundCount: "3",
      decrementPercent: "10",
      items: [{ supplyId: flour.id, quantity: "40", specs: "Marca indistinta", startingPrice: "700" }],
      excludedSupplierIds: [],
    });
    expect((await load(owner.id, draft.id)).draft).toEqual(draft);
  });

  it("keeps half-filled values: a draft does not need to be publishable", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);

    const draft = await save(
      owner.id,
      draftInput(flour.id, {
        decrementPercent: "",
        items: [{ supplyId: flour.id, quantity: "", specs: "", startingPrice: "" }],
      }),
    );

    expect(draft.decrementPercent).toBe("");
    expect(draft.items).toEqual([{ supplyId: flour.id, quantity: "", specs: "", startingPrice: "" }]);
  });

  it("creates a second draft instead of replacing the first", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const sugar = await createSupply(owner.id, "Azúcar", db);
    const first = await save(owner.id, draftInput(flour.id));
    const second = await save(owner.id, draftInput(sugar.id));

    const drafts = await listTenderDraftsService(owner.id, db);
    expect(drafts.map((draft) => draft.number)).toEqual([2, 1]);
    expect(drafts.map((draft) => draft.id)).toEqual([second.id, first.id]);
    expect((await load(owner.id, first.id)).draft?.items.map((item) => item.supplyId)).toEqual([flour.id]);
    expect((await load(owner.id, second.id)).draft?.items.map((item) => item.supplyId)).toEqual([sugar.id]);
  });

  it("updates the chosen draft without changing its number", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const sugar = await createSupply(owner.id, "Azúcar", db);
    const draft = await save(owner.id, draftInput(flour.id));

    const updated = await saveTenderDraftService(
      owner.id,
      draftInput(sugar.id, { items: [{ supplyId: sugar.id, quantity: "5", specs: "", startingPrice: "900" }] }),
      draft.id,
      db,
    );

    expect(updated).toMatchObject({ id: draft.id, number: 1 });
    const drafts = await listTenderDraftsService(owner.id, db);
    expect(drafts).toHaveLength(1);
    expect((await load(owner.id, draft.id)).draft?.items.map((item) => item.supplyId)).toEqual([sugar.id]);
  });

  it("needs at least one supply", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);

    await expect(save(owner.id, draftInput(flour.id, { items: [] }))).rejects.toBeInstanceOf(ZodError);
    expect(await listTenderDraftsService(owner.id, db)).toEqual([]);
  });

  it("rejects a supply from another emprendedor's catalog", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const foreign = await createSupply(other.id, "Harina ajena", db);

    await expectAppError(save(owner.id, draftInput(foreign.id)), "TENDER_SUPPLY_NOT_FOUND");
  });

  it("rejects a draft that belongs to another emprendedor", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const foreignSupply = await createSupply(other.id, "Azúcar ajena", db);
    const foreignDraft = await save(other.id, draftInput(foreignSupply.id));

    await expectAppError(
      saveTenderDraftService(owner.id, draftInput(flour.id), foreignDraft.id, db),
      "TENDER_DRAFT_NOT_FOUND",
    );
    expect((await load(other.id, foreignDraft.id)).draft?.items.map((item) => item.supplyId)).toEqual([
      foreignSupply.id,
    ]);
  });

  it("is private to its emprendedor", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const draft = await save(owner.id, draftInput(flour.id));

    expect(await listTenderDraftsService(other.id, db)).toEqual([]);
    expect((await load(other.id, draft.id)).draft).toBeNull();
  });
});

describe("loading and listing drafts", () => {
  it("drops supplies deleted from the catalog, both on load and in the list", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const sugar = await createSupply(owner.id, "Azúcar", db);
    const draft = await save(
      owner.id,
      draftInput(flour.id, {
        items: [
          { supplyId: flour.id, quantity: "40", specs: "", startingPrice: "700" },
          { supplyId: sugar.id, quantity: "5", specs: "", startingPrice: "900" },
        ],
      }),
    );

    await deleteSupplyService(owner.id, sugar.id, db);

    expect((await load(owner.id, draft.id)).draft?.items.map((item) => item.supplyId)).toEqual([flour.id]);
    expect(await listTenderDraftsService(owner.id, db)).toMatchObject([{ id: draft.id, itemCount: 1 }]);
  });

  it("hides a draft whose supplies were all deleted", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const draft = await save(owner.id, draftInput(flour.id));

    await deleteSupplyService(owner.id, flour.id, db);

    expect((await load(owner.id, draft.id)).draft).toBeNull();
    expect(await listTenderDraftsService(owner.id, db)).toEqual([]);
  });
});

describe("discardTenderDraftService", () => {
  it("deletes only the chosen draft", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const sugar = await createSupply(owner.id, "Azúcar", db);
    const first = await save(owner.id, draftInput(flour.id));
    const second = await save(owner.id, draftInput(sugar.id));

    await discardTenderDraftService(owner.id, first.id, db);

    expect((await load(owner.id, first.id)).draft).toBeNull();
    expect((await load(owner.id, second.id)).draft?.items.map((item) => item.supplyId)).toEqual([sugar.id]);
    expect(await listTenderDraftsService(owner.id, db)).toMatchObject([{ id: second.id, number: 2 }]);
  });

  it("rejects a foreign or malformed id and keeps both drafts", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const foreignSupply = await createSupply(other.id, "Azúcar ajena", db);
    const first = await save(owner.id, draftInput(flour.id));
    const second = await save(owner.id, draftInput(flour.id));
    const foreignDraft = await save(other.id, draftInput(foreignSupply.id));

    await expectAppError(discardTenderDraftService(owner.id, foreignDraft.id, db), "TENDER_DRAFT_NOT_FOUND");
    await expectAppError(discardTenderDraftService(owner.id, "no-es-un-uuid", db), "TENDER_DRAFT_NOT_FOUND");
    expect((await listTenderDraftsService(owner.id, db)).map((draft) => draft.id)).toEqual([second.id, first.id]);
  });
});

describe("publishing a draft", () => {
  it("deletes only the draft that became the tender", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const sugar = await createSupply(owner.id, "Azúcar", db);
    const molino = await createLinkedSupplier(owner, db, track);
    const first = await save(owner.id, draftInput(flour.id));
    const second = await save(owner.id, draftInput(sugar.id));

    await publishTenderService(owner.id, publishInput(flour.id, molino.id, first.id), db);

    expect((await load(owner.id, first.id)).draft).toBeNull();
    expect((await load(owner.id, second.id)).draft?.items.map((item) => item.supplyId)).toEqual([sugar.id]);
    expect(await listTenderDraftsService(owner.id, db)).toMatchObject([{ id: second.id, number: 2 }]);
  });

  it("keeps the draft when publishing fails", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const other = await makeUser();
    const foreign = await createLinkedSupplier(other, db, track);
    const draft = await save(owner.id, draftInput(flour.id));

    await expectAppError(
      publishTenderService(owner.id, publishInput(flour.id, foreign.id, draft.id), db),
      "TENDER_SUPPLIER_NOT_LINKED",
    );

    expect((await load(owner.id, draft.id)).draft).not.toBeNull();
  });

  it("keeps drafts when publishing without one", async () => {
    const owner = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const molino = await createLinkedSupplier(owner, db, track);
    const draft: TenderDraft = await save(owner.id, draftInput(flour.id));

    await publishTenderService(owner.id, publishInput(flour.id, molino.id), db);

    expect((await load(owner.id, draft.id)).draft).not.toBeNull();
  });

  it("rejects a foreign draft id and publishes nothing", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const flour = await createSupply(owner.id, "Harina 000", db);
    const foreignSupply = await createSupply(other.id, "Azúcar ajena", db);
    const molino = await createLinkedSupplier(owner, db, track);
    const foreignDraft = await save(other.id, draftInput(foreignSupply.id));

    await expectAppError(
      publishTenderService(owner.id, publishInput(flour.id, molino.id, foreignDraft.id), db),
      "TENDER_DRAFT_NOT_FOUND",
    );
    expect((await load(other.id, foreignDraft.id)).draft).not.toBeNull();
    expect(await listTendersService(owner.id, db)).toEqual([]);
  });
});
