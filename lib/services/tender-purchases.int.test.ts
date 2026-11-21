import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";

import { createLinkedSupplier, createSupply } from "../../tests/support/factories/tender";
import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
  awardItemService,
  getPurchaseOrderService,
  getTenderHistoryService,
  issuePurchaseOrderService,
  requestNegotiationService,
  sendThankYouNoteService,
} from "./tender-purchases";
import {
  cancelTenderService,
  getSupplierTenderService,
  getTenderDetailService,
  listSupplierNoticesService,
  publishTenderService,
  submitOffersService,
} from "./tenders";

// Integration tests for choosing suppliers, negotiating, purchase orders, the
// thank-you note and the history (docs/licitaciones RN-14 to RN-17, RN-21).

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

// Flour and sugar, closes at +24 h. Molino quotes both; Dulce only flour,
// cheaper.
async function closedTender({ withSilentSupplier = false } = {}) {
  const owner = await createUser();
  track(owner);
  const flour = await createSupply(owner.id, "Harina 000", db);
  const sugar = await createSupply(owner.id, "Azúcar", db);
  const molino = await createLinkedSupplier(owner, db, track, "Molino San José");
  const dulce = await createLinkedSupplier(owner, db, track, "Dulce SA");
  const silent = withSilentSupplier ? await createLinkedSupplier(owner, db, track, "Sin Oferta SRL") : null;
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
      supplierIds: silent ? [molino.id, dulce.id, silent.id] : [molino.id, dulce.id],
    },
    db,
    start,
  );
  const detail = await getTenderDetailService(owner.id, id, db, start);
  const flourId = detail.items[0]!.id;
  const sugarId = detail.items[1]!.id;
  const invitation = (supplier: CreatedUser) => detail.invitations.find((i) => i.supplierUserId === supplier.id)!.id;
  await submitOffersService(
    molino.id,
    id,
    {
      offers: [
        { itemId: flourId, unitPrice: "780" },
        { itemId: sugarId, unitPrice: "950" },
      ],
    },
    db,
    at(1),
  );
  await submitOffersService(dulce.id, id, { offers: [{ itemId: flourId, unitPrice: "740" }] }, db, at(7));
  return {
    owner,
    molino,
    dulce,
    tenderId: id,
    flourId,
    sugarId,
    molinoInv: invitation(molino),
    dulceInv: invitation(dulce),
    silentInv: silent ? invitation(silent) : null,
  };
}

describe("awardItemService (RN-14)", () => {
  it("chooses a supplier per item, splitting the purchase, and allows changing the choice", async () => {
    const t = await closedTender();

    await awardItemService(t.owner.id, t.tenderId, { itemId: t.flourId, invitationId: t.molinoInv, unitPrice: "780" }, db, at(25));
    await awardItemService(t.owner.id, t.tenderId, { itemId: t.flourId, invitationId: t.dulceInv, unitPrice: "740" }, db, at(26));
    await awardItemService(t.owner.id, t.tenderId, { itemId: t.sugarId, invitationId: t.molinoInv, unitPrice: "940" }, db, at(26));

    const detail = await getTenderDetailService(t.owner.id, t.tenderId, db, at(27));
    expect(detail.awards).toEqual([
      { itemId: t.flourId, invitationId: t.dulceInv, unitPrice: "740.00", createdAt: at(26) },
      { itemId: t.sugarId, invitationId: t.molinoInv, unitPrice: "940.00", createdAt: at(26) },
    ]);
  });

  it("only after the close, and only for a supplier that offered for the item", async () => {
    const t = await closedTender();

    expect(
      (await failure(
        awardItemService(t.owner.id, t.tenderId, { itemId: t.flourId, invitationId: t.dulceInv, unitPrice: "740" }, db, at(23)),
      )).code,
    ).toBe("TENDER_NOT_CLOSED");
    expect(
      (await failure(
        awardItemService(t.owner.id, t.tenderId, { itemId: t.sugarId, invitationId: t.dulceInv, unitPrice: "900" }, db, at(25)),
      )).code,
    ).toBe("TENDER_NO_OFFER");
  });

  it("never on a cancelled tender", async () => {
    const t = await closedTender();
    await cancelTenderService(t.owner.id, t.tenderId, db, at(8));

    expect(
      (await failure(
        awardItemService(t.owner.id, t.tenderId, { itemId: t.flourId, invitationId: t.dulceInv, unitPrice: "740" }, db, at(25)),
      )).code,
    ).toBe("TENDER_NOT_CLOSED");
  });
});

describe("requestNegotiationService (RN-21)", () => {
  it("tells the supplier in its panel and shares the emprendedor's contact", async () => {
    const t = await closedTender();

    await requestNegotiationService(t.owner.id, t.tenderId, { invitationId: t.molinoInv, contact: "ana@panaderia.test / 11 5555-0000" }, db, at(25));
    // A second request keeps the first one.
    await requestNegotiationService(t.owner.id, t.tenderId, { invitationId: t.molinoInv, contact: "otro" }, db, at(26));

    const view = await getSupplierTenderService(t.molino.id, t.tenderId, db, at(27));
    expect(view.negotiation).toEqual({ requestedAt: at(25), contact: "ana@panaderia.test / 11 5555-0000" });
    expect(await listSupplierNoticesService(t.molino.id, db, at(27))).toContainEqual({
      tenderId: t.tenderId,
      number: 1,
      ownerName: t.owner.displayName,
      kind: "negotiation",
      contact: "ana@panaderia.test / 11 5555-0000",
    });
    expect((await getSupplierTenderService(t.dulce.id, t.tenderId, db, at(27))).negotiation).toBeNull();
  });

  it("only with a supplier that offered (N-27)", async () => {
    const t = await closedTender({ withSilentSupplier: true });
    expect(
      (await failure(
        requestNegotiationService(t.owner.id, t.tenderId, { invitationId: t.silentInv!, contact: "11 5555-0000" }, db, at(25)),
      )).code,
    ).toBe("TENDER_NO_OFFER");
  });

  it("requires a contact", async () => {
    const t = await closedTender();
    await expect(
      requestNegotiationService(t.owner.id, t.tenderId, { invitationId: t.molinoInv, contact: "" }, db, at(25)),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe("issuePurchaseOrderService (RN-15)", () => {
  it("issues one order per awarded supplier, with lines, total, terms and a correlative number", async () => {
    const t = await closedTender();
    await awardItemService(t.owner.id, t.tenderId, { itemId: t.flourId, invitationId: t.dulceInv, unitPrice: "735.50" }, db, at(25));
    await awardItemService(t.owner.id, t.tenderId, { itemId: t.sugarId, invitationId: t.molinoInv, unitPrice: "950" }, db, at(25));

    const first = await issuePurchaseOrderService(
      t.owner.id,
      t.tenderId,
      { invitationId: t.dulceInv, deliveryTerms: "En el local, el lunes", paymentTerms: "Transferencia a 15 días" },
      db,
      at(26),
    );
    const second = await issuePurchaseOrderService(
      t.owner.id,
      t.tenderId,
      { invitationId: t.molinoInv, deliveryTerms: "Retiro", paymentTerms: "Contado" },
      db,
      at(27),
    );

    expect([first.number, second.number]).toEqual([1, 2]);
    const order = await getPurchaseOrderService(t.owner.id, first.id, db);
    expect(order).toMatchObject({
      number: 1,
      tenderNumber: 1,
      supplier: { businessName: "Dulce SA" },
      deliveryTerms: "En el local, el lunes",
      paymentTerms: "Transferencia a 15 días",
      total: "36775.00",
    });
    expect(order.issuedAt).toEqual(at(26));
    expect(order.lines).toEqual([
      { supplyName: "Harina 000", unit: "kg", quantity: "50.0000", unitPrice: "735.50", lineTotal: "36775.00" },
    ]);
  });

  it("is final: no second order for the supplier and no change to the items it covers", async () => {
    const t = await closedTender();
    await awardItemService(t.owner.id, t.tenderId, { itemId: t.flourId, invitationId: t.dulceInv, unitPrice: "740" }, db, at(25));
    const terms = { invitationId: t.dulceInv, deliveryTerms: "Local", paymentTerms: "Contado" };
    await issuePurchaseOrderService(t.owner.id, t.tenderId, terms, db, at(26));

    expect((await failure(issuePurchaseOrderService(t.owner.id, t.tenderId, terms, db, at(27)))).code).toBe(
      "TENDER_ORDER_EXISTS",
    );
    expect(
      (await failure(
        awardItemService(t.owner.id, t.tenderId, { itemId: t.flourId, invitationId: t.molinoInv, unitPrice: "780" }, db, at(27)),
      )).code,
    ).toBe("TENDER_ORDER_EXISTS");
  });

  it("needs at least one item chosen for that supplier", async () => {
    const t = await closedTender();
    expect(
      (await failure(
        issuePurchaseOrderService(t.owner.id, t.tenderId, { invitationId: t.molinoInv, deliveryTerms: "a", paymentTerms: "b" }, db, at(25)),
      )).code,
    ).toBe("TENDER_NOTHING_AWARDED");
  });

  it("never shows an order to another emprendedor", async () => {
    const t = await closedTender();
    await awardItemService(t.owner.id, t.tenderId, { itemId: t.flourId, invitationId: t.dulceInv, unitPrice: "740" }, db, at(25));
    const { id } = await issuePurchaseOrderService(
      t.owner.id,
      t.tenderId,
      { invitationId: t.dulceInv, deliveryTerms: "Local", paymentTerms: "Contado" },
      db,
      at(26),
    );
    const stranger = await createUser();
    track(stranger);

    expect((await failure(getPurchaseOrderService(stranger.id, id, db))).code).toBe("TENDER_NOT_FOUND");
  });
});

describe("sendThankYouNoteService (RN-16)", () => {
  it("shows the same note to the suppliers not chosen, without prices or results", async () => {
    const t = await closedTender();
    await awardItemService(t.owner.id, t.tenderId, { itemId: t.flourId, invitationId: t.dulceInv, unitPrice: "740" }, db, at(25));

    expect((await failure(sendThankYouNoteService(t.owner.id, t.tenderId, db, at(23)))).code).toBe("TENDER_NOT_CLOSED");
    await sendThankYouNoteService(t.owner.id, t.tenderId, db, at(26));

    const molinoView = await getSupplierTenderService(t.molino.id, t.tenderId, db, at(27));
    expect(molinoView.showThankYouNote).toBe(true);
    expect(JSON.stringify(molinoView)).not.toContain("740.00");
    expect(await listSupplierNoticesService(t.molino.id, db, at(27))).toContainEqual(
      expect.objectContaining({ kind: "thank_you", tenderId: t.tenderId }),
    );
    expect((await getSupplierTenderService(t.dulce.id, t.tenderId, db, at(27))).showThankYouNote).toBe(false);
  });
});

describe("getTenderHistoryService (RN-17)", () => {
  it("lists the whole process with date and time, oldest first", async () => {
    const t = await closedTender();
    await awardItemService(t.owner.id, t.tenderId, { itemId: t.flourId, invitationId: t.dulceInv, unitPrice: "740" }, db, at(25));
    await requestNegotiationService(t.owner.id, t.tenderId, { invitationId: t.molinoInv, contact: "11 5555-0000" }, db, at(25.5));
    await issuePurchaseOrderService(
      t.owner.id,
      t.tenderId,
      { invitationId: t.dulceInv, deliveryTerms: "Local", paymentTerms: "Contado" },
      db,
      at(26),
    );
    await sendThankYouNoteService(t.owner.id, t.tenderId, db, at(27));

    const history = await getTenderHistoryService(t.owner.id, t.tenderId, db, at(28));

    expect(history.map((event) => event.kind)).toEqual([
      "published",
      "offer",
      "offer",
      "round",
      "offer",
      "round",
      "round",
      "closed",
      "award",
      "negotiation",
      "order",
      "thank_you",
    ]);
    expect(history[0]).toMatchObject({ kind: "published", at: start, decrementPercent: "10.00" });
    expect(history.find((event) => event.kind === "award")).toMatchObject({
      supplier: "Dulce SA",
      item: "Harina 000",
      unitPrice: "740.00",
    });
  });
});

describe("history of a void tender (RN-17, RN-18, RN-19)", () => {
  it("records the round-1 warning and that it closed void", async () => {
    const owner = await createUser();
    track(owner);
    const flour = await createSupply(owner.id, "Harina 000", db);
    const molino = await createLinkedSupplier(owner, db, track, "Molino San José");
    const { id } = await publishTenderService(
      owner.id,
      {
        roundHours: 6,
        roundCount: 2,
        decrementPercent: "10",
        items: [{ supplyId: flour.id, quantity: "5", startingPrice: "800" }],
        supplierIds: [molino.id],
      },
      db,
      start,
    );

    const history = await getTenderHistoryService(owner.id, id, db, at(13));

    expect(history.map((event) => event.kind)).toEqual(["published", "round", "no_offers_warning", "closed"]);
    expect(history[2]).toMatchObject({ at: at(6), items: ["Harina 000"] });
    expect(history[3]).toMatchObject({ at: at(12), isVoid: true });
  });
});
