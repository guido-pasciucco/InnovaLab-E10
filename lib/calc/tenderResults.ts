import Decimal from "decimal.js";

import { latestOffers, offerKey, type OfferRecord } from "./tenderOffers";

// Results of supply tenders (docs/licitaciones RN-13, RN-18, RN-19). Pure.

type ResultItem = { id: string; startingPrice: string; referencePrice: string | null };

// RN-18: items that received no offer during the first round.
export function itemsWithoutRoundOneOffers(items: readonly { id: string }[], offers: readonly OfferRecord[]): string[] {
  const quoted = new Set(offers.filter((offer) => offer.round === 1).map((offer) => offer.itemId));
  return items.filter((item) => !quoted.has(item.id)).map((item) => item.id);
}

export type PriceDifference = { amount: string; percent: string };

// Offer minus base, in pesos and in percent of the base (one decimal). A
// negative difference means the offer is cheaper.
export function priceDifference(price: string, base: string): PriceDifference {
  const amount = new Decimal(price).minus(base);
  return {
    amount: amount.toFixed(2),
    percent: amount.div(base).times(100).toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toFixed(1),
  };
}

export type ComparisonRow = {
  invitationId: string;
  unitPrice: string | null;
  round: number | null;
  vsStarting: PriceDifference | null;
  vsReference: PriceDifference | null;
};

export type ComparisonItem = {
  itemId: string;
  // RN-19: no supplier offered for this item.
  isVoid: boolean;
  best: string | null;
  rows: ComparisonRow[];
};

// RN-13: "un cuadro comparativo por insumo con la última oferta de cada
// proveedor, la diferencia contra el precio de partida y contra el último
// precio registrado del insumo". Rows go from the lowest offer up; suppliers
// that did not quote the item come last, "sin oferta" (RN-20).
export function buildComparison(
  items: readonly ResultItem[],
  invitations: readonly { id: string }[],
  offers: readonly OfferRecord[],
): ComparisonItem[] {
  const latest = latestOffers(offers);

  return items.map((item) => {
    const rows: ComparisonRow[] = invitations.map((invitation) => {
      const offer = latest.get(offerKey(invitation.id, item.id));
      if (!offer) {
        return { invitationId: invitation.id, unitPrice: null, round: null, vsStarting: null, vsReference: null };
      }
      return {
        invitationId: invitation.id,
        unitPrice: offer.unitPrice,
        round: offer.round,
        vsStarting: priceDifference(offer.unitPrice, item.startingPrice),
        vsReference: item.referencePrice ? priceDifference(offer.unitPrice, item.referencePrice) : null,
      };
    });

    rows.sort((a, b) => {
      if (a.unitPrice === null || b.unitPrice === null) {
        return (a.unitPrice === null ? 1 : 0) - (b.unitPrice === null ? 1 : 0);
      }
      return new Decimal(a.unitPrice).comparedTo(b.unitPrice);
    });

    const best = rows[0]?.unitPrice ?? null;
    return { itemId: item.id, isVoid: best === null, best, rows };
  });
}

// RN-19: "Si ningún insumo recibió ofertas, la licitación entera queda
// desierta".
export function isTenderVoid(comparison: readonly ComparisonItem[]): boolean {
  return comparison.every((item) => item.isVoid);
}
