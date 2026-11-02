import Decimal from "decimal.js";

import {
  COST_BEHAVIORS,
  COST_TRACEABILITIES,
  type CostBehavior,
  type CostTraceability,
} from "@/lib/schemas/costs/fields";

// Pure period totals for #111. Each snapshot line is counted once, by its id,
// into the behavior bucket that owns the period total:
//
//   totalPeriodo = subtotalFijo + subtotalVariable
//   unitarioPorDocena = totalPeriodo / volume
//
// `volume` is dozens produced. Dozens sold are not an input, so they cannot
// change the divisor. `subtotalIndirecto` (traceability indirect) and
// `subtotalTrabajoPropio` (isOwnLabor) are cross-cuts: the same amount is
// already inside the total through its behavior, and adding the cross-cut
// again would bill that line twice.
//
// Money stays a Decimal until the value leaves the function. Each returned
// amount is rounded once, from full precision, with ROUND_HALF_UP to 2
// decimals. Rounding a bucket before adding it to the total is what drifts a
// cent away from a spreadsheet.

const FINAL_MONEY_DECIMALS = 2;
const FINAL_MONEY_ROUNDING = Decimal.ROUND_HALF_UP;
const ZERO_MONEY = "0.00";

export type MoneyString = string;

export type CostLine = {
  id: string;
  behavior: CostBehavior;
  traceability: CostTraceability;
  isOwnLabor: boolean;
  amount: string;
};

export type CostTotalsInput = {
  lines: CostLine[];
  volume: number;
};

export type CostTotalsErrorCode =
  | "INVALID_VOLUME"
  | "INVALID_BEHAVIOR"
  | "INVALID_TRACEABILITY"
  | "DUPLICATE_LINE_ID"
  | "INVALID_AMOUNT";

type CostTotalsSuccess = {
  ok: true;
  subtotalFijo: MoneyString;
  subtotalVariable: MoneyString;
  subtotalTrabajoPropio: MoneyString;
  subtotalIndirecto: MoneyString;
  totalPeriodo: MoneyString;
  unitarioPorDocena: MoneyString;
  volume: number;
  lineCount: number;
};

type CostTotalsFailure = {
  ok: false;
  code: CostTotalsErrorCode;
  details?: { lineId: string };
};

// Success carries the six amounts plus `{ volume, lineCount }`. Failure is a
// value, not a throw: the service that calls this (WU2) matches on `ok`.
export type CostTotalsResult = CostTotalsSuccess | CostTotalsFailure;

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function failure(code: CostTotalsErrorCode, lineId?: string): CostTotalsFailure {
  if (lineId === undefined) {
    return { ok: false, code };
  }

  return { ok: false, code, details: { lineId } };
}

function asMoney(value: Decimal): MoneyString {
  return value.toFixed(FINAL_MONEY_DECIMALS, FINAL_MONEY_ROUNDING);
}

// Decimal reports a bad literal by throwing. That throw stops here: the
// public contract is a Result, and an unparseable amount is INVALID_AMOUNT.
function parseAmount(raw: string): Decimal | undefined {
  try {
    const value = new Decimal(raw);
    return value.isFinite() ? value : undefined;
  } catch {
    return undefined;
  }
}

function zeros(volume: number): CostTotalsSuccess {
  return {
    ok: true,
    subtotalFijo: ZERO_MONEY,
    subtotalVariable: ZERO_MONEY,
    subtotalTrabajoPropio: ZERO_MONEY,
    subtotalIndirecto: ZERO_MONEY,
    totalPeriodo: ZERO_MONEY,
    unitarioPorDocena: ZERO_MONEY,
    volume,
    lineCount: 0,
  };
}

export function calculateCostTotals(input: CostTotalsInput): CostTotalsResult {
  // Volume is checked before the empty-list shortcut. An empty snapshot with
  // volume 0 is an invalid divisor, not a successful zero.
  if (!Number.isInteger(input.volume) || input.volume <= 0) {
    return failure("INVALID_VOLUME");
  }

  if (input.lines.length === 0) {
    return zeros(input.volume);
  }

  const seen = new Set<string>();
  let fijo = new Decimal(0);
  let variable = new Decimal(0);
  let trabajoPropio = new Decimal(0);
  let indirecto = new Decimal(0);

  for (const line of input.lines) {
    if (seen.has(line.id)) {
      return failure("DUPLICATE_LINE_ID", line.id);
    }

    const behavior = norm(line.behavior);
    if (!(COST_BEHAVIORS as readonly string[]).includes(behavior)) {
      return failure("INVALID_BEHAVIOR", line.id);
    }

    const traceability = norm(line.traceability);
    if (!(COST_TRACEABILITIES as readonly string[]).includes(traceability)) {
      return failure("INVALID_TRACEABILITY", line.id);
    }

    const amount = parseAmount(line.amount);
    if (amount === undefined) {
      return failure("INVALID_AMOUNT", line.id);
    }

    seen.add(line.id);

    if (behavior === "fixed") {
      fijo = fijo.plus(amount);
    } else {
      variable = variable.plus(amount);
    }

    if (line.isOwnLabor) {
      trabajoPropio = trabajoPropio.plus(amount);
    }

    if (traceability === "indirect") {
      indirecto = indirecto.plus(amount);
    }
  }

  const totalPeriodo = fijo.plus(variable);

  return {
    ok: true,
    subtotalFijo: asMoney(fijo),
    subtotalVariable: asMoney(variable),
    subtotalTrabajoPropio: asMoney(trabajoPropio),
    subtotalIndirecto: asMoney(indirecto),
    totalPeriodo: asMoney(totalPeriodo),
    unitarioPorDocena: asMoney(totalPeriodo.div(input.volume)),
    volume: input.volume,
    lineCount: input.lines.length,
  };
}
