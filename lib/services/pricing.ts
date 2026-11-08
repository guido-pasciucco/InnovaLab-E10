import "server-only";

import Decimal from "decimal.js";
import { eq } from "drizzle-orm";

import { pricingInputs } from "@/lib/db/calculation/table";
import {
  saveExpectedMarginInputSchema,
  type SaveExpectedMarginInput,
} from "@/lib/db/calculation/validation";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";
import { MARGIN_CONVENTION_ON_PRICE } from "@/lib/schemas/calculation/fields";
import type { CalculatorPricingInputs } from "@/lib/types/calculator";

import { getDraftCalculationIdForUser } from "./calculator";

// Step 5 persistence: the expected margin of the user's draft, in the 1:1
// `pricing_inputs` row. The service validates with the server gate from
// lib/db (saveExpectedMarginInputSchema) and sets the margin convention
// itself: the user never chooses it (pending decision, see
// lib/schemas/calculation/fields.ts). Owner scoping comes from
// getDraftCalculationIdForUser, which only resolves the caller's own draft.
// The service throws (ZodError, AppError); doors translate. No try/catch.

/**
 * Read model for step 5. It never writes.
 *
 * Null semantics: no draft returns both values null; a draft without a
 * `pricing_inputs` row returns its `calculationId` and a null margin.
 */
export async function getCalculatorPricingInputsService(
  userId: string,
  db: Db = getDrizzleClient(),
): Promise<CalculatorPricingInputs> {
  const calculationId = await getDraftCalculationIdForUser(userId, db);
  if (calculationId === null) {
    return { calculationId: null, expectedMarginPct: null };
  }

  const [row] = await db
    .select({ expectedMarginPct: pricingInputs.expectedMarginPct })
    .from(pricingInputs)
    .where(eq(pricingInputs.calculationId, calculationId))
    .limit(1);

  return {
    calculationId,
    // numeric(14,4) comes back as "30.0000": show it as the user typed it.
    expectedMarginPct: row ? new Decimal(row.expectedMarginPct).toString() : null,
  };
}

/**
 * Saves the expected margin of the user's draft, creating its
 * `pricing_inputs` row on the first save.
 *
 * @throws ZodError when the margin breaks expectedMarginField (0 ≤ m < 100).
 * @throws AppError CALC_DRAFT_MISSING when the user has no draft.
 */
export async function saveExpectedMarginService(
  userId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<SaveExpectedMarginInput> {
  const { expectedMarginPct } = saveExpectedMarginInputSchema.parse(input);

  const calculationId = await getDraftCalculationIdForUser(userId, db);
  if (calculationId === null) {
    throw new AppError("CALC_DRAFT_MISSING");
  }

  await db
    .insert(pricingInputs)
    .values({
      calculationId,
      marginConvention: MARGIN_CONVENTION_ON_PRICE,
      expectedMarginPct,
    })
    .onConflictDoUpdate({
      target: pricingInputs.calculationId,
      set: {
        marginConvention: MARGIN_CONVENTION_ON_PRICE,
        expectedMarginPct,
        updatedAt: new Date(),
      },
    });

  return { expectedMarginPct };
}
