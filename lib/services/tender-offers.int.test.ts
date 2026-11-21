import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";

import { createLinkedSupplier, createSupply } from "../../tests/support/factories/tender";
import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
  cancelTenderService,
  getSupplierTenderService,
  getTenderDetailService,
  publishTenderService,
  submitOffersService,
} from "./tenders";

// Integration tests for supplier offers (docs/licitaciones RN-06, RN-08,
// RN-10, RN-12, RN-20) against the local Supabase stack.

const HOUR = 60 * 60 * 1000;
const start = new Date("2026-11-21T12:00:00Z");
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

const at = (hours: number) => new Date(start.getTime() + hours * HOUR);

// A published basket (flour and sugar, 6-hour rounds × 4, 10 % per round)
// with two invited suppliers.
async function publishedTender() {
  const owner = await createUser();
  track(owner);
  const flour = await createSupply(owner.id, "Harina 000", db);
  const sugar = await createSupply(owner.id, "Azúcar", db);
  const molino = await createLinkedSupplier(owner, db, track, "Molino San José");
  const dulce = await createLinkedSupplier(owner, db, track, "Dulce SA");
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
      supplierIds: [molino.id, dulce.id],
    },
    db,
    start,
  );
  const detail = await getTenderDetailService(owner.id, id, db, start);
  const [flourItem, sugarItem] = detail.items;
  return { owner, molino, dulce, tenderId: id, flourItem: flourItem!, sugarItem: sugarItem! };
}

describe("submitOffersService (RN-10)", () => {
  it("records the first offer up to the starting price, with its round", async () => {
    const t = await publishedTender();

    const result = await submitOffersService(
      t.molino.id,
      t.tenderId,
      { offers: [{ itemId: t.flourItem.id, unitPrice: "780" }] },
      db,
      at(1),
    );

    expect(result).toEqual({ round: 1, count: 1 });
    const view = await getSupplierTenderService(t.molino.id, t.tenderId, db, at(1));
    expect(view.items[0]).toMatchObject({ myLastPrice: "780.00" });
    expect(view.items[0]?.myOffers).toEqual([{ round: 1, unitPrice: "780.00", createdAt: at(1) }]);
  });

  it("rejects a first offer above the starting price, under that item's field", async () => {
    const t = await publishedTender();

    const error = await failure(
      submitOffersService(t.molino.id, t.tenderId, { offers: [{ itemId: t.flourItem.id, unitPrice: "800.01" }] }, db, at(1)),
    );

    expect(error.code).toBe("VALIDATION");
    expect(error.details).toEqual({
      formErrors: [],
      fieldErrors: { [`price-${t.flourItem.id}`]: ["Tu primera oferta no puede superar el precio de partida ($ 800,00)."] },
    });
  });

  it("lets the supplier lower or ratify its price in later rounds, never raise it", async () => {
    const t = await publishedTender();
    const offer = (unitPrice: string, hours: number) =>
      submitOffersService(t.molino.id, t.tenderId, { offers: [{ itemId: t.flourItem.id, unitPrice }] }, db, at(hours));

    await offer("780", 1);
    await expect(offer("750", 7)).resolves.toEqual({ round: 2, count: 1 });
    await expect(offer("750", 13)).resolves.toEqual({ round: 3, count: 1 });
    const error = await failure(offer("751", 19));
    expect(error.details).toMatchObject({
      fieldErrors: {
        [`price-${t.flourItem.id}`]: ["No podés ofertar por encima de tu último precio ($ 750,00). Podés bajarlo o mantenerlo."],
      },
    });
  });

  it("rejects the whole submission when one price breaks the rule (nothing is half saved)", async () => {
    const t = await publishedTender();

    await failure(
      submitOffersService(
        t.molino.id,
        t.tenderId,
        {
          offers: [
            { itemId: t.flourItem.id, unitPrice: "700" },
            { itemId: t.sugarItem.id, unitPrice: "1200" },
          ],
        },
        db,
        at(1),
      ),
    );

    const view = await getSupplierTenderService(t.molino.id, t.tenderId, db, at(1));
    expect(view.items.map((item) => item.myLastPrice)).toEqual([null, null]);
  });
});

describe("partial quotes in a basket (RN-20)", () => {
  it("quotes only some items; blank ones stay without an offer", async () => {
    const t = await publishedTender();

    await submitOffersService(
      t.molino.id,
      t.tenderId,
      {
        offers: [
          { itemId: t.flourItem.id, unitPrice: "" },
          { itemId: t.sugarItem.id, unitPrice: "950" },
        ],
      },
      db,
      at(1),
    );

    const view = await getSupplierTenderService(t.molino.id, t.tenderId, db, at(1));
    expect(view.items.map((item) => item.myLastPrice)).toEqual([null, "950.00"]);
  });

  it("asks for at least one price", async () => {
    const t = await publishedTender();

    await expect(
      submitOffersService(t.molino.id, t.tenderId, { offers: [{ itemId: t.flourItem.id, unitPrice: " " }] }, db, at(1)),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe("when offers are accepted (RN-12)", () => {
  it("accepts nothing after the close or once cancelled", async () => {
    const t = await publishedTender();
    const offer = (hours: number) =>
      submitOffersService(t.molino.id, t.tenderId, { offers: [{ itemId: t.flourItem.id, unitPrice: "700" }] }, db, at(hours));

    expect((await failure(offer(24))).code).toBe("TENDER_NOT_ACTIVE");
    await cancelTenderService(t.owner.id, t.tenderId, db, at(2));
    expect((await failure(offer(3))).code).toBe("TENDER_NOT_ACTIVE");
  });

  it("only accepts offers from invited suppliers, for items of that tender", async () => {
    const t = await publishedTender();
    const outsider = await createLinkedSupplier(t.owner, db, track, "Llegó tarde");
    const other = await publishedTender();

    expect(
      (await failure(
        submitOffersService(outsider.id, t.tenderId, { offers: [{ itemId: t.flourItem.id, unitPrice: "700" }] }, db, at(1)),
      )).code,
    ).toBe("TENDER_NOT_FOUND");
    expect(
      (await failure(
        submitOffersService(t.molino.id, t.tenderId, { offers: [{ itemId: other.flourItem.id, unitPrice: "700" }] }, db, at(1)),
      )).code,
    ).toBe("TENDER_NOT_FOUND");
  });
});

describe("who sees the offers (RN-06, RN-08)", () => {
  it("shows the emprendedor every offer with the supplier's identity from the start", async () => {
    const t = await publishedTender();
    await submitOffersService(t.molino.id, t.tenderId, { offers: [{ itemId: t.flourItem.id, unitPrice: "780" }] }, db, at(1));
    await submitOffersService(t.dulce.id, t.tenderId, { offers: [{ itemId: t.flourItem.id, unitPrice: "790" }] }, db, at(2));

    const detail = await getTenderDetailService(t.owner.id, t.tenderId, db, at(3));
    const byName = new Map(detail.invitations.map((inv) => [inv.id, inv.businessName]));
    expect(detail.offers.map((o) => [byName.get(o.invitationId), o.unitPrice, o.round])).toEqual([
      ["Molino San José", "780.00", 1],
      ["Dulce SA", "790.00", 1],
    ]);
  });

  it("never shows a supplier the other suppliers' offers", async () => {
    const t = await publishedTender();
    await submitOffersService(t.molino.id, t.tenderId, { offers: [{ itemId: t.flourItem.id, unitPrice: "777" }] }, db, at(1));

    const view = await getSupplierTenderService(t.dulce.id, t.tenderId, db, at(1));
    expect(view.items[0]?.myLastPrice).toBeNull();
    expect(JSON.stringify(view)).not.toContain("777");
  });
});
