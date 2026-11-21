import Decimal from "decimal.js";

// Choices and purchase orders of supply tenders (docs/licitaciones RN-14,
// RN-15). Pure.

export type AwardRecord = {
  id: string;
  itemId: string;
  invitationId: string;
  unitPrice: string;
  createdAt: Date;
};

// The current choice per item: the latest one (earlier choices stay in the
// history, RN-17).
export function latestAwards<T extends AwardRecord>(awards: readonly T[]): Map<string, T> {
  const latest = new Map<string, T>();
  for (const award of awards) {
    const current = latest.get(award.itemId);
    if (
      !current ||
      award.createdAt.getTime() > current.createdAt.getTime() ||
      (award.createdAt.getTime() === current.createdAt.getTime() && award.id > current.id)
    ) {
      latest.set(award.itemId, award);
    }
  }
  return latest;
}

// RN-15: "ítems, cantidades, precio unitario, total". Each line is quantity ×
// unit price rounded to cents (half up); the total adds the rounded lines, so
// the printed lines always add up to the printed total.
export function orderTotals(lines: readonly { quantity: string; unitPrice: string }[]): {
  lines: string[];
  total: string;
} {
  const amounts = lines.map((line) =>
    new Decimal(line.quantity).times(line.unitPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
  );
  const total = amounts.reduce((sum, amount) => sum.plus(amount), new Decimal(0));
  return { lines: amounts.map((amount) => amount.toFixed(2)), total: total.toFixed(2) };
}
