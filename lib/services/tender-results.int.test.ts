import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";

import { createRegisteredSupplier, createSupply } from "../../tests/support/factories/tender";
import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
  acknowledgeNoOfferWarningService,
  cancelTenderService,
  getTenderDetailService,
  listSupplierNoticesService,
  listTenderNoticesService,
  publishTenderService,
  submitOffersService,
} from "./tenders";

// Integration tests for the round-1 warning, the close and the panel notices
// (docs/flujos/09-licitaciones.md RN-13, RN-18, RN-19, RN-24).

const HOUR = 60 * 60 * 1000;
const start = new Date("2026-11-21T12:00:00Z");
const at = (hours: number) => new Date(start.getTime() + hours * HOUR);
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

async function failure(promise: Promise<unknown>): Promise<AppError> {
  const error = await promise.then(
    () => null,
    (err: unknown) => err,
  );
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
}

// Flour and sugar, 6-hour rounds × 4 (closes at +24 h), two suppliers.
async function publishedTender() {
  const owner = await createUser();
  track(owner);
  const flour = await createSupply(owner.id, "Harina 000", db);
  const sugar = await createSupply(owner.id, "Azúcar", db);
  const molino = await createRegisteredSupplier(db, track, "Molino San José");
  const dulce = await createRegisteredSupplier(db, track, "Dulce SA");
  const { id } = await publishTenderService(
    owner.id,
    {
      roundHours: 6,
      roundCount: 4,
      decrementPercent: "10",
      items: [
        { supplyId: flour.id, quantity: "50", startingPrice: "800.00" },
        { supplyId: sugar.id, quantity: "20", startingPrice: "1000.00" },
      ],
    },
    db,
    start,
  );
  const detail = await getTenderDetailService(owner.id, id, db, start);
  return { owner, molino, dulce, tenderId: id, flourId: detail.items[0]!.id, sugarId: detail.items[1]!.id };
}

describe("warning after round 1 (RN-18)", () => {
  it("lists the items without offers once the first round is over", async () => {
    const t = await publishedTender();
    await submitOffersService(t.molino.id, t.tenderId, { offers: [{ itemId: t.flourId, unitPrice: "790" }] }, db, at(1));

    expect((await getTenderDetailService(t.owner.id, t.tenderId, db, at(5))).noOfferWarning).toBeNull();
    expect((await getTenderDetailService(t.owner.id, t.tenderId, db, at(6))).noOfferWarning).toEqual({
      itemIds: [t.sugarId],
    });
  });

  it("goes away when the emprendedor lets it continue, and the tender goes on", async () => {
    const t = await publishedTender();

    await acknowledgeNoOfferWarningService(t.owner.id, t.tenderId, db, at(7));

    const detail = await getTenderDetailService(t.owner.id, t.tenderId, db, at(8));
    expect(detail.noOfferWarning).toBeNull();
    expect(detail.phase).toBe("active");
  });

  it("goes away when the emprendedor cancels instead", async () => {
    const t = await publishedTender();

    await cancelTenderService(t.owner.id, t.tenderId, db, at(7));

    expect((await getTenderDetailService(t.owner.id, t.tenderId, db, at(8))).noOfferWarning).toBeNull();
  });

  it("cannot be acknowledged once the tender closed", async () => {
    const t = await publishedTender();
    expect((await failure(acknowledgeNoOfferWarningService(t.owner.id, t.tenderId, db, at(25)))).code).toBe(
      "TENDER_NOT_ACTIVE",
    );
  });
});

describe("closing (RN-12, RN-13, RN-19)", () => {
  it("builds the comparative table only after the close, with void items apart", async () => {
    const t = await publishedTender();
    await submitOffersService(t.molino.id, t.tenderId, { offers: [{ itemId: t.flourId, unitPrice: "790" }] }, db, at(1));
    await submitOffersService(t.dulce.id, t.tenderId, { offers: [{ itemId: t.flourId, unitPrice: "760" }] }, db, at(8));

    expect((await getTenderDetailService(t.owner.id, t.tenderId, db, at(23))).comparison).toBeNull();

    const closed = await getTenderDetailService(t.owner.id, t.tenderId, db, at(24));
    expect(closed.isVoid).toBe(false);
    const [flourRow, sugarRow] = closed.comparison!;
    expect(flourRow).toMatchObject({ itemId: t.flourId, isVoid: false, best: "760.00" });
    expect(flourRow?.rows[0]).toMatchObject({ unitPrice: "760.00", vsStarting: { amount: "-40.00", percent: "-5.0" } });
    expect(sugarRow).toMatchObject({ itemId: t.sugarId, isVoid: true });
  });

  it("is a void tender when nobody offered", async () => {
    const t = await publishedTender();
    const closed = await getTenderDetailService(t.owner.id, t.tenderId, db, at(24));
    expect(closed.isVoid).toBe(true);
  });
});

describe("emprendedor notices (RN-24)", () => {
  it("warns about items without offers and announces the close for a week", async () => {
    const t = await publishedTender();

    expect(await listTenderNoticesService(t.owner.id, db, at(7))).toEqual([
      { kind: "no_offers", tenderId: t.tenderId, number: 1, items: ["Harina 000", "Azúcar"] },
    ]);
    expect(await listTenderNoticesService(t.owner.id, db, at(25))).toEqual([
      { kind: "closed", tenderId: t.tenderId, number: 1, isVoid: true },
    ]);
    expect(await listTenderNoticesService(t.owner.id, db, at(24 + 7 * 24 + 1))).toEqual([]);
  });
});

describe("supplier notices (RN-24)", () => {
  it("announces the new rounds and the close, with no invitation notice (#309)", async () => {
    const t = await publishedTender();
    const base = { tenderId: t.tenderId, number: 1, ownerName: t.owner.displayName };

    // In round 1 there is no notice: invitations no longer exist.
    expect(await listSupplierNoticesService(t.molino.id, db, at(1))).toEqual([]);

    await submitOffersService(t.molino.id, t.tenderId, { offers: [{ itemId: t.flourId, unitPrice: "790" }] }, db, at(2));
    expect(await listSupplierNoticesService(t.molino.id, db, at(3))).toEqual([]);
    expect(await listSupplierNoticesService(t.molino.id, db, at(7))).toEqual([
      { ...base, kind: "round", round: 2, roundCount: 4 },
    ]);
    expect(await listSupplierNoticesService(t.molino.id, db, at(25))).toEqual([{ ...base, kind: "closed" }]);
  });

  it("tells suppliers when a tender is cancelled", async () => {
    const t = await publishedTender();
    await cancelTenderService(t.owner.id, t.tenderId, db, at(2));

    expect(await listSupplierNoticesService(t.dulce.id, db, at(3))).toEqual([
      { tenderId: t.tenderId, number: 1, ownerName: t.owner.displayName, kind: "cancelled" },
    ]);
  });
});
