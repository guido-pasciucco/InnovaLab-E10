import { randomInt } from "node:crypto";

import { cuitCheckDigit } from "@/lib/schemas/suppliers/cuit";

// Random CUIT with a valid check digit. Unique enough for tests that run
// against a shared local database (the column is unique).
export function randomValidCuit(): string {
  for (;;) {
    const first10 = `20${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;
    const digit = cuitCheckDigit(first10);
    if (digit !== null) return `${first10}${digit}`;
  }
}

// Supplier data as the registration form sends it.
export function buildSupplierProfile(overrides: Record<string, unknown> = {}) {
  return {
    businessName: "Molino San José",
    cuit: randomValidCuit(),
    contactName: "Ana Pérez",
    phone: "+54 11 5555-1234",
    categories: "Harinas, Azúcares",
    acceptTerms: "on",
    ...overrides,
  };
}
