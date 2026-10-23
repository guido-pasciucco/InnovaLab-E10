import { z } from "zod";

import {
  amountField,
  behaviorField,
  conceptField,
  isOwnLaborField,
  traceabilityField,
} from "./fields";

// Form contract. Keys match the calc_cost_lines columns: concept, amount,
// behavior, traceability and isOwnLabor (column is_own_labor, ticket #91).
// `amount` is a validated decimal string — never a float — so no money rule
// leaks into the domain.
//
// The dimensions are independent: the user answers each one separately, and no
// refinement crosses them (decision confirmed 2026-10-17).
export const costLineSchema = z.object({
  concept: conceptField,
  amount: amountField,
  behavior: behaviorField,
  traceability: traceabilityField,
  isOwnLabor: isOwnLaborField,
});

export type CostBehavior = z.infer<typeof behaviorField>;
export type CostTraceability = z.infer<typeof traceabilityField>;
export type CostLineInput = z.input<typeof costLineSchema>;
export type CostLine = z.infer<typeof costLineSchema>;