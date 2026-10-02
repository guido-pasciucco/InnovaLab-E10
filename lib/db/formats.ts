import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Evaluation spike only: shared format helpers for the drizzle-zod schemas in
// each domain's validation.ts.
//
// Numeric columns arrive as decimal strings (Drizzle maps `numeric` to
// `string` in TypeScript): money with up to 2 decimals, quantities/rates/
// percentages with up to 4 decimals. Mapping to the pure domain in
// lib/money happens at the application boundary.
// ---------------------------------------------------------------------------

export const uuidString = z.string().uuid();

export const moneyString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Expected a decimal string with up to 2 decimals");

export const quantityString = z
  .string()
  .regex(
    /^-?\d+(\.\d{1,4})?$/,
    "Expected a decimal string with up to 4 decimals",
  );

export const nameString = (max: number) => z.string().trim().min(1).max(max);
export const codeString = (max: number) => z.string().trim().min(1).max(max);
