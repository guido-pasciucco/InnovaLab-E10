import type { CostLine } from "@/components/calculator/cost-line-row-item";

// Pure helpers for the period expenses screen (#243). Kept apart from the
// component so the mapping and the month label are testable without rendering.

// The public shape the screen needs from a saved line. The service returns the
// full `business_cost_lines` row; the table only names what it shows.
export type PeriodCostLineView = {
  id: string;
  concept: string;
  amountPeriod: string;
};

// Month names are written here, not taken from Intl: the output must be the
// same on every machine and runtime, and the tests are the authority (same
// reasoning as lib/money/format.ts for amounts).
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const PERIOD_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * Renders the period key the service returns ("2026-11") as the label the
 * screen shows ("noviembre de 2026"). An unexpected key is returned unchanged
 * instead of throwing: the server validates it, and a label must never break
 * the page.
 */
export function formatPeriodLabel(period: string): string {
  const match = PERIOD_KEY.exec(period);
  if (!match) return period;

  return `${MONTHS[Number(match[2]) - 1]} de ${match[1]}`;
}

// The line table is shared with the calculator steps, whose column is
// `amount`. The period expenses service names the column `amountPeriod`.
export function toCostLine(line: PeriodCostLineView): CostLine {
  return {
    id: line.id,
    concept: line.concept,
    amount: line.amountPeriod,
  };
}
