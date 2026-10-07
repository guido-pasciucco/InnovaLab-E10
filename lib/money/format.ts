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
// formatARS covers the visual side: it turns a stored decimal back into what a
// person reads, "$ 1.234,50".
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

// ---------------------------------------------------------------------------
// Display side (#95). The mirror of parseARS, and it does not call it: the two
// never run back to back. The amount is parsed at the form boundary, stored as
// a numeric column, read back as a string and formatted here, with the
// calculation engine in between.
//
// No Intl.NumberFormat with "es-AR": its output varies by machine and by
// runtime version, so the same amount could format differently in two
// environments and the tests would only pass in one. The tests are the
// authority, so the format is built from string operations instead.
// ---------------------------------------------------------------------------

// A stored decimal: an optional sign and up to two decimals, which is exactly
// what `moneyString` accepts (lib/db/formats.ts), so anything the database can
// hand back formats.
const DECIMAL = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

const CURRENCY_PREFIX = "$ ";
const DECIMAL_SEPARATOR = ",";
const GROUP_SEPARATOR = ".";

// Two decimals always, so two rows of the same table line up and can be read at
// a glance. `1234.5` becomes "50", not "5".
function withTwoDecimals(digits: string | undefined): string {
  if (digits === undefined) {
    return "00";
  }

  return digits.length === 1 ? `${digits}0` : digits;
}

// A dot every three digits, counted from the right: 1 -> 1, 1234 -> 1.234,
// 1234567 -> 1.234.567. Grouping from the right is what keeps it correct for
// every length without special-casing.
function withThousandsSeparators(digits: string): string {
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);

  return grouped;
}

/**
 * Renders a stored decimal the way an amount is read in Argentina: "$ 1.234,50".
 *
 * Always two decimals and always grouped, so the column of a table is scannable.
 * A negative amount keeps its sign after the currency symbol ("$ -1.234,50"):
 * a leading dash would read as a dash rather than as a minus.
 *
 * Unlike parseARS, an amount that is not a decimal returns an empty string
 * instead of null. There is no reason to explain here — the caller renders
 * whatever it gets, and an unrenderable amount must not crash a results screen.
 * In practice this cannot happen: the input comes from a `numeric` column or
 * from parseARS, both of which guarantee a valid decimal. It matters for
 * negative amounts, which the form rejects but the database does allow, since
 * a contribution margin below zero is a real result worth showing.
 *
 * Colours, warnings and whether a loss deserves an alert belong to the caller,
 * not here: this file owns the format, the component owns the presentation.
 */
export function formatARS(amount: string): string {
  const decimal = DECIMAL.exec(amount);
  if (!decimal) {
    return "";
  }

  const [, sign, integer, fraction] = decimal;
  const cents = withTwoDecimals(fraction);

  return `${CURRENCY_PREFIX}${sign}${withThousandsSeparators(integer)}${DECIMAL_SEPARATOR}${cents}`;
}
