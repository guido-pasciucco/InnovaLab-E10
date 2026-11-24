import Decimal from "decimal.js";

// Round arithmetic for supply tenders (docs/flujos/09-licitaciones.md RN-02, RN-09,
// RN-12). Pure: no React, Next or db. Times are absolute instants; the
// server clock decides them and the screens show them in Buenos Aires time.
//
// Rounds are not stored: they follow from the publish time, the round length
// and the number of rounds, so they advance on their own with no scheduled job
// (RN-09: "la aplicación avanza las rondas ... sin que el emprendedor
// intervenga").

const HOUR_MS = 60 * 60 * 1000;

export type TenderSchedule = { startsAt: Date; roundHours: number; roundCount: number };
export type TenderPhase = "active" | "closed" | "cancelled";

// RN-02: "La duración de la licitación es la cantidad de rondas por la
// duración de cada ronda."
export function tenderEndsAt(startsAt: Date, roundHours: number, roundCount: number): Date {
  return new Date(startsAt.getTime() + roundHours * roundCount * HOUR_MS);
}

export function roundStartsAt(schedule: TenderSchedule, round: number): Date {
  return new Date(schedule.startsAt.getTime() + (round - 1) * schedule.roundHours * HOUR_MS);
}

// 1-based round in force at `now`, or null when the tender is over. Before
// the start (never the case today: tenders start when published) it is 1.
export function currentRound(schedule: TenderSchedule, now: Date): number | null {
  const elapsed = now.getTime() - schedule.startsAt.getTime();
  const round = Math.max(1, Math.floor(elapsed / (schedule.roundHours * HOUR_MS)) + 1);
  return round > schedule.roundCount ? null : round;
}

// RN-12: "La licitación cierra sola al vencer la duración." A cancelled
// tender (RN-03, RN-18) stays cancelled.
export function tenderPhase(
  tender: { endsAt: Date; cancelledAt: Date | null },
  now: Date,
): TenderPhase {
  if (tender.cancelledAt) return "cancelled";
  return now.getTime() < tender.endsAt.getTime() ? "active" : "closed";
}

// Target price of every round. Term *Precio objetivo*: "precio objetivo
// anterior × (1 − % de baja)". Round 1 targets the starting price (ES-01
// example: $1.000, then $900, then $810). Each target is rounded to cents
// (half up) and the next one starts from that rounded value, so the screens
// and the arithmetic always agree.
export function targetPrices(startingPrice: string, decrementPercent: string, roundCount: number): string[] {
  const factor = new Decimal(1).minus(new Decimal(decrementPercent).div(100));
  const targets: string[] = [];
  let target = new Decimal(startingPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  for (let round = 1; round <= roundCount; round++) {
    targets.push(target.toFixed(2));
    target = target.times(factor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }
  return targets;
}

export function targetPrice(startingPrice: string, decrementPercent: string, round: number): string {
  return targetPrices(startingPrice, decrementPercent, round)[round - 1];
}

// Starting price suggested from the supply catalog (RN-02): the catalog
// purchase price per purchase unit (e.g. $18.750 for 25 kg → $750 per kg).
export function catalogUnitPrice(purchasePrice: string, purchaseQuantity: string): string {
  return new Decimal(purchasePrice)
    .div(new Decimal(purchaseQuantity))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toFixed(2);
}
