import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";

import { createLinkedSupplier, createSupply } from "../../tests/support/factories/tender";
import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { deleteSupplyService } from "./supplies";
import {
  cancelTenderService,
  getSupplierTenderService,
  getTenderDetailService,
  getTenderFormDataService,
  listSupplierTendersService,
  listTendersService,
  publishTenderService,
} from "./tenders";

// Integration tests for publishing tenders (docs/flujos/09-licitaciones.md RN-01 to RN-07,
// RN-09, RN-12) against the local Supabase stack.

const HOUR = 60 * 60 * 1000;
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

// An emprendedor with two supplies and two linked suppliers.
async function scenario() {
  const owner = await makeUser();
  const flour = await createSupply(owner.id, "Harina 000", db);
  const sugar = await createSupply(owner.id, "Azúcar", db, {
    purchasePrice: "1000.00",
    purchaseQuantity: "1",
    purchaseUnit: "kg",
  });
  const molino = await createLinkedSupplier(owner, db, track, "Molino San José");
  const dulce = await createLinkedSupplier(owner, db, track, "Dulce SA");
  return { owner, flour, sugar, molino, dulce };
}

function publishInput(s: Awaited<ReturnType<typeof scenario>>, overrides: Record<string, unknown> = {}) {
  return {
    roundHours: "6",
    roundCount: "4",
    decrementPercent: "10",
    items: [
      { supplyId: s.flour.id, quantity: "50", specs: "Bolsa de 25 kg", startingPrice: "800" },
      { supplyId: s.sugar.id, quantity: "20", specs: "", startingPrice: "1000.00" },
    ],
    supplierIds: [s.molino.id, s.dulce.id],
    ...overrides,
  };
}

describe("getTenderFormDataService", () => {
  it("suggests each supply's catalog price per purchase unit and lists the linked suppliers (RN-02, RN-05)", async () => {
    const s = await scenario();

    const data = await getTenderFormDataService(s.owner.id, null, db);

    expect(data.supplies.find((x) => x.id === s.flour.id)).toMatchObject({
      name: "Harina 000",
      unit: "kg",
      suggestedPrice: "750.00",
    });
    expect(data.suppliers.map((x) => x.businessName).sort()).toEqual(["Dulce SA", "Molino San José"]);
    expect(data.activeTender).toBeNull();
  });
});

describe("publishTenderService", () => {
  it("publishes with a correlative number, starts now and lasts rounds × hours (RN-02, RN-09)", async () => {
    const s = await scenario();
    const now = new Date("2026-11-21T12:00:00Z");

    const first = await publishTenderService(s.owner.id, publishInput(s), db, now);

    expect(first.number).toBe(1);
    const detail = await getTenderDetailService(s.owner.id, first.id, db, now);
    expect(detail).toMatchObject({
      number: 1,
      phase: "active",
      currentRound: 1,
      roundHours: 6,
      roundCount: 4,
      decrementPercent: "10.00",
    });
    expect(detail.startsAt.toISOString()).toBe("2026-11-21T12:00:00.000Z");
    expect(detail.endsAt.toISOString()).toBe("2026-11-22T12:00:00.000Z");
    expect(detail.items.map((i) => [i.supplyName, i.unit, i.quantity, i.startingPrice, i.referencePrice])).toEqual([
      ["Harina 000", "kg", "50.0000", "800.00", "750.00"],
      ["Azúcar", "kg", "20.0000", "1000.00", "1000.00"],
    ]);
    expect(detail.items[0]?.targets).toEqual(["800.00", "720.00", "648.00", "583.20"]);
    expect(detail.invitations).toHaveLength(2);

    // After it closes, the next one gets number 2.
    const later = new Date(now.getTime() + 25 * HOUR);
    const second = await publishTenderService(s.owner.id, publishInput(s), db, later);
    expect(second.number).toBe(2);
  });

  it("allows only one active tender at a time (RN-03)", async () => {
    const s = await scenario();
    await publishTenderService(s.owner.id, publishInput(s), db);

    await expectAppError(publishTenderService(s.owner.id, publishInput(s), db), "TENDER_ACTIVE_EXISTS");
  });

  it("only tenders supplies of the emprendedor's own catalog (RN-01)", async () => {
    const s = await scenario();
    const stranger = await makeUser();
    const foreign = await createSupply(stranger.id, "Ajena", db);

    await expectAppError(
      publishTenderService(
        s.owner.id,
        publishInput(s, { items: [{ supplyId: foreign.id, quantity: "1", startingPrice: "10" }] }),
        db,
      ),
      "TENDER_SUPPLY_NOT_FOUND",
    );
  });

  it("only invites suppliers registered with the emprendedor (RN-05)", async () => {
    const s = await scenario();
    const otherOwner = await makeUser();
    const outsider = await createLinkedSupplier(otherOwner, db, track, "Ajeno SRL");

    await expectAppError(
      publishTenderService(s.owner.id, publishInput(s, { supplierIds: [outsider.id] }), db),
      "TENDER_SUPPLIER_NOT_LINKED",
    );
  });

  it("rejects a missing starting price, a round length outside 6/12/24 and a round count outside 2–5", async () => {
    const s = await scenario();

    for (const overrides of [
      { items: [{ supplyId: s.flour.id, quantity: "1", startingPrice: "" }] },
      { roundHours: "8" },
      { roundCount: "6" },
      { supplierIds: [] },
    ]) {
      await expect(publishTenderService(s.owner.id, publishInput(s, overrides), db)).rejects.toBeInstanceOf(
        ZodError,
      );
    }
  });

  it("keeps the published copy when the supply is later deleted from the catalog (RN-17)", async () => {
    const s = await scenario();
    const { id } = await publishTenderService(s.owner.id, publishInput(s), db);

    await deleteSupplyService(s.owner.id, s.sugar.id, db);

    const detail = await getTenderDetailService(s.owner.id, id, db);
    expect(detail.items.map((i) => i.supplyName)).toEqual(["Harina 000", "Azúcar"]);
  });
});

describe("rounds and closing (RN-09, RN-12)", () => {
  it("advances the round and the target price with the clock and closes at the end", async () => {
    const s = await scenario();
    const now = new Date("2026-11-21T12:00:00Z");
    const { id } = await publishTenderService(s.owner.id, publishInput(s), db, now);

    const third = await getTenderDetailService(s.owner.id, id, db, new Date(now.getTime() + 13 * HOUR));
    expect(third.currentRound).toBe(3);
    expect(third.items[0]?.currentTarget).toBe("648.00");

    const closed = await getTenderDetailService(s.owner.id, id, db, new Date(now.getTime() + 24 * HOUR));
    expect(closed.phase).toBe("closed");
    expect(closed.currentRound).toBeNull();
  });
});

describe("cancelTenderService (RN-03)", () => {
  it("cancels an active tender and frees the slot for a new one", async () => {
    const s = await scenario();
    const { id } = await publishTenderService(s.owner.id, publishInput(s), db);

    await cancelTenderService(s.owner.id, id, db);

    expect((await getTenderDetailService(s.owner.id, id, db)).phase).toBe("cancelled");
    await expect(publishTenderService(s.owner.id, publishInput(s), db)).resolves.toMatchObject({ number: 2 });
  });

  it("cannot cancel after the close, nor someone else's tender", async () => {
    const s = await scenario();
    const now = new Date();
    const { id } = await publishTenderService(s.owner.id, publishInput(s), db, now);
    const stranger = await makeUser();

    await expectAppError(cancelTenderService(stranger.id, id, db), "TENDER_NOT_FOUND");
    await expectAppError(cancelTenderService(s.owner.id, id, db, new Date(now.getTime() + 25 * HOUR)), "TENDER_NOT_ACTIVE");
  });
});

describe("owner scoping", () => {
  it("never shows a tender to another emprendedor", async () => {
    const s = await scenario();
    const { id } = await publishTenderService(s.owner.id, publishInput(s), db);
    const stranger = await makeUser();

    await expect(listTendersService(stranger.id, db)).resolves.toEqual([]);
    await expectAppError(getTenderDetailService(stranger.id, id, db), "TENDER_NOT_FOUND");
    await expectAppError(getTenderDetailService(stranger.id, "not-a-uuid", db), "TENDER_NOT_FOUND");
  });
});

describe("supplier view (RN-06, RN-07, RN-22)", () => {
  it("shows invited suppliers the terms and the current target, never the reference price", async () => {
    const s = await scenario();
    const now = new Date("2026-11-21T12:00:00Z");
    const { id } = await publishTenderService(s.owner.id, publishInput(s), db, now);

    const list = await listSupplierTendersService(s.molino.id, db, now);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id, number: 1, ownerName: s.owner.displayName, phase: "active" });

    const view = await getSupplierTenderService(s.molino.id, id, db, new Date(now.getTime() + 7 * HOUR));
    expect(view.currentRound).toBe(2);
    expect(view.items[0]).toMatchObject({
      supplyName: "Harina 000",
      quantity: "50.0000",
      specs: "Bolsa de 25 kg",
      startingPrice: "800.00",
      currentTarget: "720.00",
    });
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("referencePrice");
    expect(serialized).not.toContain("750.00");
    expect(serialized).not.toContain("Dulce SA");
  });

  it("does not show a tender to a supplier that was not invited", async () => {
    const s = await scenario();
    const { id } = await publishTenderService(s.owner.id, publishInput(s, { supplierIds: [s.molino.id] }), db);

    await expect(listSupplierTendersService(s.dulce.id, db)).resolves.toEqual([]);
    await expectAppError(getSupplierTenderService(s.dulce.id, id, db), "TENDER_NOT_FOUND");
  });
});

describe("listTendersService", () => {
  it("lists the emprendedor's tenders, newest first, with their phase", async () => {
    const s = await scenario();
    const now = new Date();
    await publishTenderService(s.owner.id, publishInput(s), db, new Date(now.getTime() - 30 * HOUR));
    await publishTenderService(s.owner.id, publishInput(s), db, now);

    const list = await listTendersService(s.owner.id, db, now);
    expect(list.map((t) => [t.number, t.phase, t.itemCount, t.invitedCount])).toEqual([
      [2, "active", 2, 2],
      [1, "closed", 2, 2],
    ]);
  });
});
