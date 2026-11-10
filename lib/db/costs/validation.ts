import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { moneyString, quantityString, uuidString } from "../formats";
import {
  amountField,
  behaviorField,
  conceptField,
  costPeriodField,
  hoursField,
  traceabilityField,
  yieldField,
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
  period: costPeriodField,
  amountPeriod: moneyString,
});

export const calcCostLineRowSchema = createSelectSchema(calcCostLines, {
  amount: moneyString,
  hours: quantityString.nullable(),
  hourlyRate: quantityString.nullable(),
  allocationPct: quantityString.nullable(),
  yieldQuantity: quantityString,
});

// --- Public inputs: insert schema minus every server-controlled field. ---

export const createBusinessCostLineInputSchema = createInsertSchema(
  businessCostLines,
  {
    period: costPeriodField,
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

// Period expenses of the product catalog (#243). The client sends only the
// concept and the amount; the period is optional (the service defaults it to
// the current month) and behavior/traceability are server-owned: a period
// expense is a fixed, indirect cost. These schemas are separate from the
// generic business-cost input so the client cannot set the dimensions.
export const addPeriodCostLineInputSchema = z.object({
  period: costPeriodField.optional(),
  concept: conceptField,
  amountPeriod: amountField,
});

export const listPeriodCostsOptionsSchema = z.object({
  period: costPeriodField.optional(),
});

export const updatePeriodCostLineAmountInputSchema = z.object({
  amountPeriod: amountField,
});

export const updatePeriodCostLineConceptInputSchema = z.object({
  concept: conceptField,
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
  yieldQuantity: yieldField.optional(),
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

// Paso 3 adds the product units one purchase yields. It is optional: an
// omitted yield takes the column default, 1. The service injects behavior,
// traceability and the null catalog link, as in paso 2.
export const addVariableCalcCostLineInputSchema = addCalcCostLineInputSchema.extend({
  yieldQuantity: yieldField.optional(),
});

// Paso 3 can correct the yield of a variable line it already saved. The
// object has only the yield, so no other column can be patched with it.
export const updateCalcCostLineYieldInputSchema = z.object({
  yieldQuantity: yieldField,
});

// Paso 2 can correct the amount of a line it already saved. The object has
// no concept, behavior or traceability, so those columns cannot be patched.
export const updateCalcCostLineAmountInputSchema = z.object({
  amount: amountField,
});

// A saved line can also be renamed. Same rule as the concept of a new line;
// the object has no amount, behavior or traceability, so those cannot be patched.
export const updateCalcCostLineConceptInputSchema = z.object({
  concept: conceptField,
});

// Paso 4 saves the own-labor line with both values at once. Each one is a
// string or null: an empty input is null, and the service then saves the line
// with amount 0.00. The service injects behavior, traceability and the flag.
export const saveOwnLaborInputSchema = z.object({
  hours: hoursField.nullable(),
  hourlyRate: amountField.nullable(),
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
export type AddPeriodCostLineInput = z.infer<typeof addPeriodCostLineInputSchema>;
export type ListPeriodCostsOptions = z.infer<typeof listPeriodCostsOptionsSchema>;
export type UpdatePeriodCostLineAmountInput = z.infer<
  typeof updatePeriodCostLineAmountInputSchema
>;
export type UpdatePeriodCostLineConceptInput = z.infer<
  typeof updatePeriodCostLineConceptInputSchema
>;
export type CreateCalcCostLineInput = z.infer<typeof createCalcCostLineInputSchema>;
export type AddCalcCostLineInput = z.infer<typeof addCalcCostLineInputSchema>;
export type AddVariableCalcCostLineInput = z.infer<
  typeof addVariableCalcCostLineInputSchema
>;
export type UpdateCalcCostLineYieldInput = z.infer<
  typeof updateCalcCostLineYieldInputSchema
>;
export type UpdateCalcCostLineAmountInput = z.infer<
  typeof updateCalcCostLineAmountInputSchema
>;
export type UpdateCalcCostLineConceptInput = z.infer<
  typeof updateCalcCostLineConceptInputSchema
>;
export type SaveOwnLaborInput = z.infer<typeof saveOwnLaborInputSchema>;
export type ListCalcCostLinesOptions = z.infer<typeof listCalcCostLinesOptionsSchema>;
