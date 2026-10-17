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
// wherever it appears. Zero-width spaces (U+200B) and the BOM (U+FEFF) also
// arrive with pasted text and carry no numeric meaning, so they are removed
// too. `$` is different: only a single one at the very start is
// currency notation and gets dropped, while a stray `$` anywhere else is a
// mistake rather than noise and is left for the patterns to reject.
const NOISE = /[\s\u200B\uFEFF]/g;
const LEADING_CURRENCY = /^\$/;

// Dot groups of exactly three digits: `1.500`, `1.234.567`. Demanding a full
// group is what makes a dot unambiguous: a dot followed by one or two digits
// cannot match here, so `1.5` and `1234.50` fall through to the plain form
// below and are read as decimals, while `1.2345` matches neither and is
// rejected instead of being guessed. The first group starts with a non-zero
// digit, so `0.500` does not match here: it is ambiguous (0.5 vs 500) and
// falls through to the plain form, which rejects it for having 3 decimals.
const ARGENTINE_THOUSANDS = /^([1-9]\d{0,2}(?:\.\d{3})+)(?:,(\d{1,2}))?$/;

// No thousands separator: plain digits with an optional fraction of one or two
// digits. Comma and dot mean the same thing here — the decimal mark — so the
// separator is discarded and the output always uses a dot. One to two digits is
// the cap, which is where `12,345` and `1,234.50` are rejected. The two patterns
// cannot both match the same input, so the order between them is not a rule.
const PLAIN = /^(\d+)(?:[.,](\d{1,2}))?$/;

// Leading zeros carry no value (`007` is unambiguously 7), so they are
// stripped rather than rejected. The database normalises them on write
// anyway, and keeping them would only leak typing noise into storage.
function stripLeadingZeros(digits: string): string {
  const stripped = digits.replace(/^0+(?=\d)/, "");

  return stripped === "" ? "0" : stripped;
}

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

  const integer = stripLeadingZeros(plain[1]);
  return plain[2] === undefined ? integer : `${integer}.${plain[2]}`;
}

// ---------------------------------------------------------------------------
// Display side (#95). The mirror of parseARS, and it does not call it: the two
// never run back to back. The amount is parsed at the form boundary, stored as
// a numeric column, read back as a string and formatted here, with the
// calculation engine in between.
//
// Money and quantities are two contracts with different scales, so they are
// two functions: formatARS for `numeric(12,2)` columns (always "$ " and two
// decimals) and formatQuantity for `numeric(14,4)` columns (no currency
// symbol, four decimals). Sharing one regex for both is what rendered
// quantities such as `1234.5678` as a blank cell (BUG-003).
//
// No Intl.NumberFormat with "es-AR": its output varies by machine and by
// runtime version, so the same amount could format differently in two
// environments and the tests would only pass in one. The tests are the
// authority, so the format is built from string operations instead.
// ---------------------------------------------------------------------------

// A stored money decimal: an optional sign and up to two decimals, which is
// what `moneyString` accepts (lib/db/formats.ts). Anything with more decimals
// is not money — it is a quantity passed to the wrong formatter — and renders
// as an empty string rather than a silently truncated amount.
const DECIMAL_MONEY = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

// A stored quantity decimal: an optional sign and up to four decimals, which
// is what `quantityString` accepts (lib/db/formats.ts) and what the
// `numeric(14,4)` columns hand back.
const DECIMAL_QUANTITY = /^(-?)(\d+)(?:\.(\d{1,4}))?$/;

const CURRENCY_PREFIX = "$ ";
const DECIMAL_SEPARATOR = ",";
const GROUP_SEPARATOR = ".";

// Always the full scale, so two rows of the same table line up and can be
// read at a glance. `1234.5` becomes "50", not "5".
function withFixedDecimals(digits: string | undefined, scale: 2 | 4): string {
  if (digits === undefined) {
    return scale === 2 ? "00" : "0000";
  }

  return digits.padEnd(scale, "0");
}

// A dot every three digits, counted from the right: 1 -> 1, 1234 -> 1.234,
// 1234567 -> 1.234.567. Grouping from the right is what keeps it correct for
// every length without special-casing.
function withThousandsSeparators(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
}

// Negative zero is zero: `-0` and `-0.00` are storage noise, not a loss worth
// flagging with a minus sign.
function isZero(integer: string, fraction: string | undefined): boolean {
  return (
    /^0+$/.test(integer) &&
    (fraction === undefined || /^0+$/.test(fraction))
  );
}

function formatDecimal(
  amount: string,
  opts: { decimals: 2 | 4; prefix: string },
): string {
  const pattern =
    opts.decimals === 2 ? DECIMAL_MONEY : DECIMAL_QUANTITY;
  const decimal = pattern.exec(amount);
  if (!decimal) {
    return "";
  }

  const [, sign, rawInteger, fraction] = decimal;
  const integer = stripLeadingZeros(rawInteger);
  const scaled = withFixedDecimals(fraction, opts.decimals);
  const normalisedSign = isZero(integer, fraction) ? "" : sign;

  return `${opts.prefix}${normalisedSign}${withThousandsSeparators(integer)}${DECIMAL_SEPARATOR}${scaled}`;
}

/**
 * Renders a stored money decimal the way an amount is read in Argentina:
 * "$ 1.234,50".
 *
 * Always two decimals and always grouped, so the column of a table is scannable.
 * A negative amount keeps its sign after the currency symbol ("$ -1.234,50"):
 * a leading dash would read as a dash rather than as a minus.
 *
 * Unlike parseARS, an amount that is not a decimal returns an empty string
 * instead of null. There is no reason to explain here — the caller renders
 * whatever it gets, and an unrenderable amount must not crash a results screen.
 * In practice this cannot happen: the input comes from a `numeric(12,2)`
 * column or from parseARS, both of which guarantee a valid decimal. It matters for
 * negative amounts, which the form rejects but the database does allow, since
 * a contribution margin below zero is a real result worth showing.
 *
 * Colours, warnings and whether a loss deserves an alert belong to the caller,
 * not here: this file owns the format, the component owns the presentation.
 */
export function formatARS(amount: string): string {
  return formatDecimal(amount, { decimals: 2, prefix: CURRENCY_PREFIX });
}

/**
 * Renders a stored quantity, rate or percentage the way a magnitude is read
 * in Argentina: "1.234,5678".
 *
 * Always four decimals and always grouped, mirroring formatARS at the
 * `numeric(14,4)` scale. No currency symbol: quantities are not money, and a
 * "$ " prefix would mislabel units such as `break_even_units` as an amount.
 * Negative zero normalises to zero, and anything beyond four decimals renders
 * as an empty string instead of crashing the caller.
 */
export function formatQuantity(amount: string): string {
  return formatDecimal(amount, { decimals: 4, prefix: "" });
}
