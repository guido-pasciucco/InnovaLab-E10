import { describe, expect, it } from "vitest";

import { checkOffer, latestOffers } from "./tenderOffers";

describe("checkOffer (RN-10)", () => {
  it("accepts a first offer up to the starting price", () => {
    expect(checkOffer("800.00", { startingPrice: "800.00", lastPrice: null })).toEqual({ ok: true });
    expect(checkOffer("650", { startingPrice: "800.00", lastPrice: null })).toEqual({ ok: true });
  });

  it("rejects a first offer above the starting price", () => {
    expect(checkOffer("800.01", { startingPrice: "800.00", lastPrice: null })).toEqual({
      ok: false,
      reason: "above_starting",
    });
  });

  it("lets the supplier lower or ratify its price, never raise it", () => {
    expect(checkOffer("700.00", { startingPrice: "800.00", lastPrice: "700.00" })).toEqual({ ok: true });
    expect(checkOffer("650.50", { startingPrice: "800.00", lastPrice: "700.00" })).toEqual({ ok: true });
    expect(checkOffer("700.01", { startingPrice: "800.00", lastPrice: "700.00" })).toEqual({
      ok: false,
      reason: "above_last",
    });
  });
});

describe("latestOffers", () => {
  it("keeps each supplier's last offer per item", () => {
    const offers = [
      { id: "1", itemId: "flour", invitationId: "a", round: 1, unitPrice: "800.00", createdAt: new Date("2026-11-21T12:00:00Z") },
      { id: "2", itemId: "flour", invitationId: "a", round: 2, unitPrice: "760.00", createdAt: new Date("2026-11-21T18:30:00Z") },
      { id: "3", itemId: "flour", invitationId: "b", round: 1, unitPrice: "790.00", createdAt: new Date("2026-11-21T13:00:00Z") },
      { id: "4", itemId: "sugar", invitationId: "a", round: 1, unitPrice: "990.00", createdAt: new Date("2026-11-21T12:00:00Z") },
    ];

    const latest = latestOffers(offers);

    expect(latest.get("a:flour")?.unitPrice).toBe("760.00");
    expect(latest.get("b:flour")?.unitPrice).toBe("790.00");
    expect(latest.get("a:sugar")?.unitPrice).toBe("990.00");
    expect(latest.get("b:sugar")).toBeUndefined();
  });

  it("keeps the lowest price as the current offer even if two submissions got reversed timestamps", () => {
    // RN-10 only accepts prices at or below the current one, so the offer that
    // committed last is always the lowest, whatever time it was stamped with.
    const offers = [
      { id: "1", itemId: "flour", invitationId: "a", round: 1, unitPrice: "700.00", createdAt: new Date("2026-11-21T12:00:00.000Z") },
      { id: "2", itemId: "flour", invitationId: "a", round: 1, unitPrice: "720.00", createdAt: new Date("2026-11-21T12:00:00.005Z") },
    ];
    expect(latestOffers(offers).get("a:flour")?.unitPrice).toBe("700.00");
  });

  it("keeps the later round when the price was ratified", () => {
    const offers = [
      { id: "1", itemId: "flour", invitationId: "a", round: 1, unitPrice: "700.00", createdAt: new Date("2026-11-21T12:00:00Z") },
      { id: "2", itemId: "flour", invitationId: "a", round: 2, unitPrice: "700.00", createdAt: new Date("2026-11-21T19:00:00Z") },
    ];
    expect(latestOffers(offers).get("a:flour")?.round).toBe(2);
  });
});
