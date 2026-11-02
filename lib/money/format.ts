// ---------------------------------------------------------------------------
// Argentine amount parsing (#94). Pure: no I/O, no Date. parseARS carries no
// user-facing message; parseAmountInput (below) borrows them from amountField
// instead of writing its own.
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

import { amountField } from "@/lib/schemas/costs/fields";

// Whitespace anywhere, including the non-breaking spaces that arrive with
// pasted text: `1 000 000` and `$ 1.234,50` are amounts written with grouping
// spaces, so the space carries no meaning between digits and is removed
// wherever it appears. `$` is different: only a single one at the very start is
// currency notation and gets dropped, while a stray `$` anywhere else is a
// mistake rather than noise and is left for the patterns to reject.
const NOISE = /\s/g;
const LEADING_CURRENCY = /^\$/;

// The two shapes are built from the fraction they accept, so the strict parser
// (one to two decimals) and the lenient one behind parseAmountInput (any number
// of decimals, so the schema can say "hasta 2 decimales") cannot drift apart.
//
// Dot groups of exactly three digits: `1.500`, `1.234.567`. Demanding a full
// group is what makes a dot unambiguous: a dot followed by one or two digits
// cannot match here, so `1.5` and `1234.50` fall through to the plain form
// below and are read as decimals, while `1.2345` matches neither and is
// rejected instead of being guessed.
function thousandsPattern(fraction: string): RegExp {
  return new RegExp(`^(\\d{1,3}(?:\\.\\d{3})+)(?:,(${fraction}))?$`);
}
const ARGENTINE_THOUSANDS = thousandsPattern("\\d{1,2}");
const LENIENT_THOUSANDS = thousandsPattern("\\d+");

// No thousands separator: plain digits with an optional fraction of one or two
// digits. Comma and dot mean the same thing here — the decimal mark — so the
// separator is discarded and the output always uses a dot. One to two digits is
// the cap, which is where `12,345` and `1,234.50` are rejected. The two patterns
// cannot both match the same input, so the order between them is not a rule.
function plainPattern(fraction: string): RegExp {
  return new RegExp(`^(\\d+)(?:[.,](${fraction}))?$`);
}
const PLAIN = plainPattern("\\d{1,2}");
const LENIENT_PLAIN = plainPattern("\\d+");

function stripNoise(input: string): string {
  return input.replace(NOISE, "").replace(LEADING_CURRENCY, "");
}

// Shared by parseARS and the lenient reader: only the patterns differ.
function normalise(
  cleaned: string,
  thousandsShape: RegExp,
  plainShape: RegExp,
): string | null {
  // An empty amount is rejected rather than defaulted, and a leading minus is
  // rejected because a negative amount is never valid. Both are listed as
  // separate rows in the contract table, so loosening the patterns below to
  // accept a sign would silently change what this function guarantees.
  if (cleaned === "" || cleaned.startsWith("-")) {
    return null;
  }

  const thousands = thousandsShape.exec(cleaned);
  if (thousands) {
    const integer = thousands[1].replace(/\./g, "");
    return thousands[2] === undefined ? integer : `${integer}.${thousands[2]}`;
  }

  const plain = plainShape.exec(cleaned);
  if (!plain) {
    return null;
  }

  return plain[2] === undefined ? plain[1] : `${plain[1]}.${plain[2]}`;
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
  return normalise(stripNoise(input), ARGENTINE_THOUSANDS, PLAIN);
}

export type AmountInput =
  | { amount: string; issue: null }
  | { amount: null; issue: string };

/**
 * Reads an amount a person is typing: the decimal string when it is a valid
 * amount, or the Spanish message that says what is wrong with it.
 *
 * parseARS answers "is this an Argentine amount?" with a bare null. A field
 * needs the reason, so this reads the text with the same shapes but without the
 * two-decimal cap ("1234,567" becomes "1234.567") and lets amountField, the
 * single owner of the cost-amount rules, accept it or explain why not.
 * Anything it cannot read as a number is handed over as typed, so letters and
 * negatives get amountField's own message.
 */
export function parseAmountInput(input: string): AmountInput {
  const cleaned = stripNoise(input);
  // The sign is read apart so a negative typed with a comma still gets the
  // negative message instead of "not a number".
  const sign = cleaned.startsWith("-") ? "-" : "";
  const unsigned = cleaned.slice(sign.length);
  const candidate =
    sign + (normalise(unsigned, LENIENT_THOUSANDS, LENIENT_PLAIN) ?? unsigned);

  const result = amountField.safeParse(candidate);
  if (result.success) {
    return { amount: result.data, issue: null };
  }

  return { amount: null, issue: result.error.issues[0]?.message ?? "El importe no es válido." };
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
