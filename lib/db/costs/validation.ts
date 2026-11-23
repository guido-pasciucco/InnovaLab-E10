import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { moneyString } from "../formats";
import {
  amountField,
  behaviorField,
  conceptField,
  costPeriodField,
  traceabilityField,
} from "@/lib/schemas/costs/fields";
import { businessCostLines } from "./table";

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

// The catalog modal edits concept and amount together. One validated pair
// keeps the save atomic: two sequential patches could leave a half-saved line
// if the second one failed. It uses the same field rules as the create input.
export const updatePeriodCostLineInputSchema = z.object({
  concept: conceptField,
  amountPeriod: amountField,
});

// --- Inferred input/row types: single source of truth, no manual interfaces. ---

export type BusinessCostLineRow = z.infer<typeof businessCostLineRowSchema>;

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
export type UpdatePeriodCostLineInput = z.infer<
  typeof updatePeriodCostLineInputSchema
>;
