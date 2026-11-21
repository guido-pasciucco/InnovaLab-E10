// CUIT check (RN-23: "se controla que su CUIT tenga formato y dígito
// verificador correctos"). Pure and client-safe.
//
// A CUIT has 11 digits: a 2-digit type, an 8-digit number and a check digit.
// It is usually written with dashes (20-12345678-6); the stored form is the
// 11 bare digits, so the same CUIT typed with or without dashes is one value.
// The type prefix is not checked against a list: AFIP has added prefixes over
// time, and the check digit already rejects mistyped numbers.

const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

// Removes the separators people usually type (dashes, dots, spaces).
export function normalizeCuit(input: string): string {
  return input.replace(/[\s.\-]/g, "");
}

// Check digit for the first 10 digits, or null when the number has none
// (remainder 10 means AFIP never issues that combination).
export function cuitCheckDigit(first10: string): number | null {
  let sum = 0;
  for (let i = 0; i < WEIGHTS.length; i++) {
    sum += Number(first10[i]) * WEIGHTS[i];
  }
  const digit = 11 - (sum % 11);
  if (digit === 11) return 0;
  if (digit === 10) return null;
  return digit;
}

// True for 11 bare digits whose last digit matches the check digit.
export function isValidCuit(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false;
  const expected = cuitCheckDigit(digits.slice(0, 10));
  return expected !== null && expected === Number(digits[10]);
}

// 20123456786 → 20-12345678-6, for display.
export function formatCuit(digits: string): string {
  if (!/^\d{11}$/.test(digits)) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}
