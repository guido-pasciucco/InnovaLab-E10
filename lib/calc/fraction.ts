// Exact rational arithmetic for the variable-cost engine. Inputs are finite
// decimal strings; intermediate values never become decimal approximations.

const DECIMAL_INPUT = /^([+-]?)(\d+)(?:\.(\d+))?$/;
const MAX_INPUT_DIGITS = 100;
const NEGATIVE_ONE = BigInt(-1);
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TEN = BigInt(10);

function absolute(value: bigint): bigint {
  return value < ZERO ? -value : value;
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = absolute(left);
  let b = absolute(right);
  while (b !== ZERO) {
    [a, b] = [b, a % b];
  }
  return a;
}

function powerOfTen(exponent: number): bigint {
  let result = ONE;
  for (let index = 0; index < exponent; index += 1) result *= TEN;
  return result;
}

/** A normalized fraction with a positive denominator. */
export class Fraction {
  readonly numerator: bigint;
  readonly denominator: bigint;

  private constructor(numerator: bigint, denominator: bigint) {
    if (denominator <= ZERO) throw new RangeError("Fraction denominator must be positive.");
    const divisor = greatestCommonDivisor(numerator, denominator);
    this.numerator = numerator / divisor;
    this.denominator = denominator / divisor;
  }

  static zero(): Fraction {
    return new Fraction(ZERO, ONE);
  }

  static fromDecimal(raw: string): Fraction | undefined {
    const match = DECIMAL_INPUT.exec(raw.trim());
    if (!match) return undefined;

    const [, sign, integer, fraction = ""] = match;
    if (integer.length + fraction.length > MAX_INPUT_DIGITS) return undefined;
    const digits = `${integer}${fraction}`.replace(/^0+(?=\d)/, "");

    const numerator = BigInt(digits || "0") * (sign === "-" ? NEGATIVE_ONE : ONE);
    return new Fraction(numerator, powerOfTen(fraction.length));
  }

  add(other: Fraction): Fraction {
    return new Fraction(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  subtract(other: Fraction): Fraction {
    return new Fraction(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  multiply(other: Fraction): Fraction {
    return new Fraction(this.numerator * other.numerator, this.denominator * other.denominator);
  }

  divide(other: Fraction): Fraction {
    if (other.numerator === ZERO) throw new RangeError("Cannot divide a fraction by zero.");
    const sign = other.numerator < ZERO ? NEGATIVE_ONE : ONE;
    return new Fraction(this.numerator * sign * other.denominator, this.denominator * absolute(other.numerator));
  }

  isPositive(): boolean {
    return this.numerator > ZERO;
  }

  isNonNegative(): boolean {
    return this.numerator >= ZERO;
  }

  isInteger(): boolean {
    return this.denominator === ONE;
  }

  isZero(): boolean {
    return this.numerator === ZERO;
  }

  /** Exact ratio for explanatory UI; never a truncated periodic decimal. */
  toRatioString(): string {
    return this.denominator === ONE ? this.numerator.toString() : `${this.numerator}/${this.denominator}`;
  }

  /** Exact ROUND_HALF_UP conversion without Number or decimal approximation. */
  toFixed(decimalPlaces: number): string {
    const scale = powerOfTen(decimalPlaces);
    const scaledNumerator = absolute(this.numerator) * scale;
    let quotient = scaledNumerator / this.denominator;
    const remainder = scaledNumerator % this.denominator;
    if (remainder * BigInt(2) >= this.denominator) quotient += ONE;

    const sign = this.numerator < ZERO && quotient !== ZERO ? "-" : "";
    const digits = quotient.toString().padStart(decimalPlaces + 1, "0");
    if (decimalPlaces === 0) return `${sign}${digits}`;
    const split = digits.length - decimalPlaces;
    return `${sign}${digits.slice(0, split)}.${digits.slice(split)}`;
  }
}
