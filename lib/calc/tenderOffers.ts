import Decimal from "decimal.js";

// Offer rules of supply tenders (docs/licitaciones RN-10, RN-20). Pure.
// Prices are decimal strings; comparisons use decimal.js, never floats.

export type OfferCheck = { ok: true } | { ok: false; reason: "above_starting" | "above_last" };

// RN-10: "Nunca puede ofertar por encima de su último precio, y la primera
// oferta no puede superar el precio de partida." The same price again is a
// ratification and is valid.
export function checkOffer(
  price: string,
  limits: { startingPrice: string; lastPrice: string | null },
): OfferCheck {
  const offered = new Decimal(price);
  if (limits.lastPrice === null) {
    return offered.lte(limits.startingPrice) ? { ok: true } : { ok: false, reason: "above_starting" };
  }
  return offered.lte(limits.lastPrice) ? { ok: true } : { ok: false, reason: "above_last" };
}

export type OfferRecord = {
  id: string;
  itemId: string;
  invitationId: string;
  round: number;
  unitPrice: string;
  createdAt: Date;
};

export function offerKey(invitationId: string, itemId: string): string {
  return `${invitationId}:${itemId}`;
}

// True when `a` came after `b`. Same instant: the later round wins, then the
// lower price (RN-10 only lets prices go down, so the newer of two offers
// made in the same instant is never the higher one).
function isNewer(a: OfferRecord, b: OfferRecord): boolean {
  if (a.createdAt.getTime() !== b.createdAt.getTime()) return a.createdAt.getTime() > b.createdAt.getTime();
  if (a.round !== b.round) return a.round > b.round;
  return new Decimal(a.unitPrice).lt(b.unitPrice);
}

// Last offer of each supplier (invitation) for each item. RN-10: "Si no
// responde, se considera que ratifica", so the last offer stands until a
// newer one replaces it.
export function latestOffers<T extends OfferRecord>(offers: readonly T[]): Map<string, T> {
  const latest = new Map<string, T>();
  for (const offer of offers) {
    const key = offerKey(offer.invitationId, offer.itemId);
    const current = latest.get(key);
    if (!current || isNewer(offer, current)) latest.set(key, offer);
  }
  return latest;
}
