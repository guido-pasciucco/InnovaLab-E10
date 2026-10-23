import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Shared format helpers for the drizzle-zod schemas in each domain's
// validation.ts.
//
// Numeric columns arrive as decimal strings (Drizzle maps `numeric` to
// `string` in TypeScript): money with up to 2 decimals, quantities/rates/
// percentages with up to 4 decimals. Mapping to the pure domain in
// lib/money happens at the application boundary.
// ---------------------------------------------------------------------------

export const uuidString = z.string().uuid();

export const moneyString = z
  .string()
  // Integer part capped at 10 digits: every money column is numeric(12,2),
  // so anything longer passes Zod and dies in Postgres with a 500 instead of
  // a field error (BUG-004). The scale cap is what rejects `12,345`.
  .regex(/^-?\d{1,10}(\.\d{1,2})?$/, "Expected a decimal string with up to 2 decimals");

export const quantityString = z
  .string()
  // Same bound: every quantity column is numeric(14,4), hence 10 integer
  // digits as well (14 - 4).
  .regex(
    /^-?\d{1,10}(\.\d{1,4})?$/,
    "Expected a decimal string with up to 4 decimals",
  );

// BUG-010: `nameString` and `codeString` used to live here as two identical
// `z.string().trim().min(1).max(max)` helpers, neither declaring an `error:`.
// Zod 4 then sent its internal English message to the form ("Too small:
// expected string to have >=1 characters") through `toAppError` →
// `field-errors.ts` → `setError`. They are gone: per `lib/schemas/AGENTS.md`
// every rule and its message lives in a domain `fields.ts` — see
// `lib/schemas/business/fields.ts`, `lib/schemas/calculation/fields.ts` and
// `lib/schemas/costs/fields.ts`.
