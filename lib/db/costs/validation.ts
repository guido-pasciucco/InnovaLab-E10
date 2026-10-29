import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { moneyString, quantityString, uuidString } from "../formats";
import {
  amountField,
  behaviorField,
  conceptField,
  traceabilityField,
} from "@/lib/schemas/costs/fields";
import { businessCostLines, calcCostLines } from "./table";

// ---------------------------------------------------------------------------
// Zod schemas derived from the Drizzle tables (server-side persistence, ADR 02).
// Rule: the client sends a public input (no ids, no server-owned FKs, no
// timestamps). The server injects server-controlled fields (ownerUserId from
// the session, businessId/calculationId from the route, ids/timestamps from
// the database) before insert.
// ---------------------------------------------------------------------------

// --- Persisted rows: mirror exactly what comes back from the database. ---

export const businessCostLineRowSchema = createSelectSchema(businessCostLines, {
  amountPeriod: moneyString,
});

export const calcCostLineRowSchema = createSelectSchema(calcCostLines, {
  amount: moneyString,
  hours: quantityString.nullable(),
  hourlyRate: quantityString.nullable(),
  allocationPct: quantityString.nullable(),
});

// --- Public inputs: insert schema minus every server-controlled field. ---

export const createBusinessCostLineInputSchema = createInsertSchema(
  businessCostLines,
  {
    concept: conceptField,
    behavior: behaviorField,
    traceability: traceabilityField,
    amountPeriod: amountField,
    notes: z.string().trim().max(500).nullish(),
  },
).omit({
  id: true,
  businessId: true,
  createdAt: true,
  updatedAt: true,
});

export const createCalcCostLineInputSchema = createInsertSchema(calcCostLines, {
  scenarioId: uuidString.nullish(),
  sourceBusinessCostId: uuidString.nullish(),
  concept: conceptField,
  behavior: behaviorField,
  traceability: traceabilityField,
  amount: amountField,
  hours: quantityString.nullish(),
  hourlyRate: quantityString.nullish(),
  allocationPct: quantityString.nullish(),
}).omit({
  id: true,
  calculationId: true,
  createdAt: true,
  updatedAt: true,
});

// Paso 2 sends only the concept and the amount. The service injects behavior,
// traceability and the null catalog link; those fields are not in this object,
// so the client cannot set them.
export const addCalcCostLineInputSchema = z.object({
  concept: conceptField,
  amount: amountField,
});

export const listCalcCostLinesOptionsSchema = z.object({
  behavior: behaviorField.optional(),
});

// --- Inferred input/row types: single source of truth, no manual interfaces. ---

export type BusinessCostLineRow = z.infer<typeof businessCostLineRowSchema>;
export type CalcCostLineRow = z.infer<typeof calcCostLineRowSchema>;

export type CreateBusinessCostLineInput = z.infer<
  typeof createBusinessCostLineInputSchema
>;
export type CreateCalcCostLineInput = z.infer<typeof createCalcCostLineInputSchema>;
export type AddCalcCostLineInput = z.infer<typeof addCalcCostLineInputSchema>;
export type ListCalcCostLinesOptions = z.infer<typeof listCalcCostLinesOptionsSchema>;
