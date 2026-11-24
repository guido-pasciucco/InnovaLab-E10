import Decimal from "decimal.js";

// Pure price engine (#312, decision D29). Inputs and outputs are decimal
// strings: `numeric` columns arrive as strings and no float ever touches money.
// There are no intermediate roundings; the UI rounds to two decimals when it
// displays the amounts. Invalid inputs produce a code, never a number.

export type SuggestPriceErrorCode = "INVALID_COST" | "NO_MARKUP" | "INVALID_MARKUP";

export type SuggestPriceResult =
  | {
      ok: true;
      // Exact decimal strings, unrounded.
      suggestedPrice: string;
      profit: string;
      // Profit / price as a ratio (e.g. "0.23076923076923076923").
      realMargin: string;
    }
  | { ok: false; code: SuggestPriceErrorCode };

const DECIMAL_STRING = /^-?\d+(\.\d+)?$/;

function toDecimal(value: string | null): Decimal | null {
  if (value === null) return null;

  const trimmed = value.trim();
  // Decimal accepts exponent notation and commas, which are not decimal
  // strings in this project (the fields reject them before they get here).
  if (!DECIMAL_STRING.test(trimmed)) return null;

  try {
    const decimal = new Decimal(trimmed);
    return decimal.isFinite() ? decimal : null;
  } catch {
    return null;
  }
}

export function suggestPrice(
  cost: string | null,
  markupPercent: string | null,
): SuggestPriceResult {
  const unitCost = toDecimal(cost);
  if (unitCost === null || unitCost.isNegative()) {
    return { ok: false, code: "INVALID_COST" };
  }

  if (markupPercent === null || markupPercent.trim() === "") {
    return { ok: false, code: "NO_MARKUP" };
  }

  const markup = toDecimal(markupPercent);
  if (markup === null || !markup.gt(0)) {
    return { ok: false, code: "INVALID_MARKUP" };
  }

  const suggestedPrice = unitCost.times(markup.div(100).plus(1));
  const profit = suggestedPrice.minus(unitCost);

  return {
    ok: true,
    suggestedPrice: suggestedPrice.toString(),
    profit: profit.toString(),
    realMargin: profit.div(suggestedPrice).toString(),
  };
}
