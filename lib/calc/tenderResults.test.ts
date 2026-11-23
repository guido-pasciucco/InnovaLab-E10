import { describe, expect, it } from "vitest";

import { buildComparison, isTenderVoid, itemsWithoutRoundOneOffers, priceDifference } from "./tenderResults";

const t = (iso: string) => new Date(iso);
const flour = { id: "flour", startingPrice: "800.00", referencePrice: "750.00" };
const sugar = { id: "sugar", startingPrice: "1000.00", referencePrice: null };
const offer = (id: string, itemId: string, invitationId: string, round: number, unitPrice: string, at: string) => ({
  id,
  itemId,
  invitationId,
  round,
  unitPrice,
  createdAt: t(at),
});

describe("itemsWithoutRoundOneOffers (RN-18)", () => {
  it("lists the items nobody quoted during the first round", () => {
    const offers = [
      offer("1", "flour", "a", 1, "790.00", "2026-11-21T13:00:00Z"),
      offer("2", "sugar", "a", 2, "990.00", "2026-11-21T19:00:00Z"),
    ];

    expect(itemsWithoutRoundOneOffers([flour, sugar], offers)).toEqual(["sugar"]);
    expect(itemsWithoutRoundOneOffers([flour, sugar], [])).toEqual(["flour", "sugar"]);
  });
});

describe("priceDifference (RN-13)", () => {
  it("gives the amount and percent against a base price (negative is cheaper)", () => {
    expect(priceDifference("720.00", "800.00")).toEqual({ amount: "-80.00", percent: "-10.0" });
    expect(priceDifference("825.00", "750.00")).toEqual({ amount: "75.00", percent: "10.0" });
    expect(priceDifference("700.00", "750.00")).toEqual({ amount: "-50.00", percent: "-6.7" });
  });
});

describe("buildComparison (RN-13, RN-19, RN-20)", () => {
  const invitations = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const offers = [
    offer("1", "flour", "a", 1, "790.00", "2026-11-21T13:00:00Z"),
    offer("2", "flour", "a", 3, "740.00", "2026-11-22T01:00:00Z"),
    offer("3", "flour", "b", 2, "760.00", "2026-11-21T19:00:00Z"),
  ];

  it("ranks each item's last offers from the lowest, with the suppliers that did not quote last", () => {
    const [flourRow] = buildComparison([flour, sugar], invitations, offers);

    expect(flourRow?.isVoid).toBe(false);
    expect(flourRow?.best).toBe("740.00");
    expect(flourRow?.rows.map((row) => [row.invitationId, row.unitPrice, row.round])).toEqual([
      ["a", "740.00", 3],
      ["b", "760.00", 2],
      ["c", null, null],
    ]);
    expect(flourRow?.rows[0]?.vsStarting).toEqual({ amount: "-60.00", percent: "-7.5" });
    expect(flourRow?.rows[0]?.vsReference).toEqual({ amount: "-10.00", percent: "-1.3" });
  });

  it("marks an item without any offer as void and keeps the rest (RN-19)", () => {
    const comparison = buildComparison([flour, sugar], invitations, offers);

    expect(comparison[1]).toMatchObject({ itemId: "sugar", isVoid: true, best: null });
    expect(comparison[1]?.rows.every((row) => row.unitPrice === null)).toBe(true);
    expect(isTenderVoid(comparison)).toBe(false);
  });

  it("is a void tender when no item got offers", () => {
    expect(isTenderVoid(buildComparison([flour, sugar], invitations, []))).toBe(true);
  });

  it("has no reference difference when the item has no catalog price", () => {
    const [, sugarRow] = buildComparison(
      [flour, sugar],
      invitations,
      [offer("9", "sugar", "b", 1, "900.00", "2026-11-21T13:00:00Z")],
    );
    expect(sugarRow?.rows[0]).toMatchObject({ unitPrice: "900.00", vsReference: null });
  });

  it("has no reference difference when the catalog price was 0", () => {
    const [row] = buildComparison(
      [{ id: "flour", startingPrice: "800.00", referencePrice: "0.00" }],
      [{ id: "a" }],
      [offer("1", "flour", "a", 1, "700.00", "2026-11-21T13:00:00Z")],
    );
    expect(row?.rows[0]?.vsReference).toBeNull();
  });
});
