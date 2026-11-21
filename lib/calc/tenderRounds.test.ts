import { describe, expect, it } from "vitest";

import {
  catalogUnitPrice,
  currentRound,
  roundStartsAt,
  targetPrice,
  targetPrices,
  tenderEndsAt,
  tenderPhase,
} from "./tenderRounds";

const HOUR = 60 * 60 * 1000;
const start = new Date("2026-11-21T12:00:00Z");

describe("targetPrice (term Precio objetivo, ES-01 example)", () => {
  it("starts at the starting price and drops by the percentage each round", () => {
    // "precio de partida $1.000 el kilo y 10% de baja. El precio objetivo pasa
    // de $1.000 a $900 en la segunda ronda y a $810 en la tercera"
    expect(targetPrices("1000.00", "10", 4)).toEqual(["1000.00", "900.00", "810.00", "729.00"]);
    expect(targetPrice("1000.00", "10", 3)).toBe("810.00");
  });

  it("rounds each round's target to cents, from the previous rounded target", () => {
    // 333.33 × 0.85 = 283.3305 → 283.33; 283.33 × 0.85 = 240.8305 → 240.83
    expect(targetPrices("333.33", "15", 3)).toEqual(["333.33", "283.33", "240.83"]);
  });

  it("rounds half up", () => {
    // 10.05 × 0.5 = 5.025 → 5.03
    expect(targetPrice("10.05", "50", 2)).toBe("5.03");
  });
});

describe("tenderEndsAt (RN-02)", () => {
  it("lasts the number of rounds times the round duration", () => {
    expect(tenderEndsAt(start, 6, 4).toISOString()).toBe("2026-11-22T12:00:00.000Z");
    expect(tenderEndsAt(start, 24, 5).toISOString()).toBe("2026-11-26T12:00:00.000Z");
  });
});

describe("currentRound and roundStartsAt (RN-09)", () => {
  const tender = { startsAt: start, roundHours: 6, roundCount: 4 };

  it("advances one round every roundHours without anyone acting", () => {
    expect(currentRound(tender, start)).toBe(1);
    expect(currentRound(tender, new Date(start.getTime() + 6 * HOUR - 1))).toBe(1);
    expect(currentRound(tender, new Date(start.getTime() + 6 * HOUR))).toBe(2);
    expect(currentRound(tender, new Date(start.getTime() + 24 * HOUR - 1))).toBe(4);
  });

  it("has no current round once the tender is over (RN-12)", () => {
    expect(currentRound(tender, new Date(start.getTime() + 24 * HOUR))).toBeNull();
  });

  it("gives the start of each round", () => {
    expect(roundStartsAt(tender, 3).toISOString()).toBe("2026-11-22T00:00:00.000Z");
  });
});

describe("tenderPhase (RN-03, RN-12)", () => {
  const tender = { endsAt: tenderEndsAt(start, 6, 2), cancelledAt: null };

  it("is active until the end time and closed from then on", () => {
    expect(tenderPhase(tender, start)).toBe("active");
    expect(tenderPhase(tender, new Date(start.getTime() + 12 * HOUR))).toBe("closed");
  });

  it("is cancelled once cancelled, whatever the time", () => {
    expect(tenderPhase({ ...tender, cancelledAt: start }, start)).toBe("cancelled");
  });
});

describe("catalogUnitPrice (RN-02 suggestion)", () => {
  it("is the catalog purchase price per purchase unit, in cents", () => {
    expect(catalogUnitPrice("18750.00", "25")).toBe("750.00");
    expect(catalogUnitPrice("1000.00", "3")).toBe("333.33");
  });
});
