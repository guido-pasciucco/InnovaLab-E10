// ---------------------------------------------------------------------------
// Argentine amount parsing (#94). Pure: no I/O, no Date, no user-facing
// messages.
//
// Amounts travel through the system as plain decimal strings, never as
// numbers: `numeric` columns arrive as strings (see lib/db/formats.ts) and the
// conversion to decimal.js happens at the boundary (lib/AGENTS.md, rule 3).
// So parseARS only normalises — every operation below is string manipulation
// on purpose, with no Number()/parseFloat(), which would lose cents.
//
// It does not format: the visual side ($ 1.234,50) is #95.
// ---------------------------------------------------------------------------

// Whitespace anywhere, including the non-breaking spaces that arrive with
// pasted text: `1 000 000` and `$ 1.234,50` are amounts written with grouping
// spaces, so the space carries no meaning between digits and is removed
// wherever it appears. `$` is different: only a single one at the very start is
// currency notation and gets dropped, while a stray `$` anywhere else is a
// mistake rather than noise and is left for the patterns to reject.
const NOISE = /\s/g;
const LEADING_CURRENCY = /^\$/;

// Dot groups of exactly three digits: `1.500`, `1.234.567`. Demanding a full
// group is what makes a dot unambiguous: a dot followed by one or two digits
// cannot match here, so `1.5` and `1234.50` fall through to the plain form
// below and are read as decimals, while `1.2345` matches neither and is
// rejected instead of being guessed.
const ARGENTINE_THOUSANDS = /^(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/;

// No thousands separator: plain digits with an optional fraction of one or two
// digits. Comma and dot mean the same thing here — the decimal mark — so the
// separator is discarded and the output always uses a dot. One to two digits is
// the cap, which is where `12,345` and `1,234.50` are rejected. The two patterns
// cannot both match the same input, so the order between them is not a rule.
const PLAIN = /^(\d+)(?:[.,](\d{1,2}))?$/;

/**
 * Normalises an amount written the way Argentines write it into a plain
 * decimal string, or returns null when the input is not an unambiguous
 * Argentine amount.
 *
 * Never rounds and never pads: `0` stays `"0"` and `1234,5` becomes
 * `"1234.5"`. The result matches `moneyString` in lib/db/formats.ts.
 *
 * Null carries no reason. Distinguishing "empty", "not a number", "too many
 * decimals" and "negative" is the schema layer's job, so that the message is
 * written once and shown by both RHF and the service (lib/schemas/AGENTS.md).
 */
export function parseARS(input: string): string | null {
  const cleaned = input.replace(NOISE, "").replace(LEADING_CURRENCY, "");

  // An empty amount is rejected rather than defaulted, and a leading minus is
  // rejected because a negative amount is never valid. Both are listed as
  // separate rows in the contract table, so loosening the patterns below to
  // accept a sign would silently change what this function guarantees.
  if (cleaned === "" || cleaned.startsWith("-")) {
    return null;
  }

  const thousands = ARGENTINE_THOUSANDS.exec(cleaned);
  if (thousands) {
    const integer = thousands[1].replace(/\./g, "");
    return thousands[2] === undefined ? integer : `${integer}.${thousands[2]}`;
  }

  const plain = PLAIN.exec(cleaned);
  if (!plain) {
    return null;
  }

  return plain[2] === undefined ? plain[1] : `${plain[1]}.${plain[2]}`;
}
