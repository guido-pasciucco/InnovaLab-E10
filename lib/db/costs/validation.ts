import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { codeString, quantityString, uuidString } from "../formats";
import { amountField, conceptField } from "../../schemas/costs/fields";
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
  amount: amountField,
});

export const calcCostLineRowSchema = createSelectSchema(calcCostLines, {
  amount: amountField,
  hours: quantityString.nullable(),
  hourlyRate: quantityString.nullable(),
  allocationPct: quantityString.nullable(),
});

// --- Public inputs: insert schema minus every server-controlled field. ---

export const createBusinessCostLineInputSchema = createInsertSchema(
  businessCostLines,
  {
    concept: conceptField,
    behavior: codeString(40),
    traceability: codeString(40),
    amount: amountField,
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
  sourceBusinessCostId: uuidString,
  concept: conceptField,
  behavior: codeString(40),
  traceability: codeString(40),
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

// --- Inferred input/row types: single source of truth, no manual interfaces. ---

export type BusinessCostLineRow = z.infer<typeof businessCostLineRowSchema>;
export type CalcCostLineRow = z.infer<typeof calcCostLineRowSchema>;

export type CreateBusinessCostLineInput = z.infer<
  typeof createBusinessCostLineInputSchema
>;
export type CreateCalcCostLineInput = z.infer<typeof createCalcCostLineInputSchema>;
