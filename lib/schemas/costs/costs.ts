import { z } from "zod";

import {
  amountField,
  behaviorEnum,
  conceptField,
  isOwnLaborField,
  traceabilityEnum,
} from "./fields";

// Form contract. Keys match the calc_cost_lines columns: concept, amount,
// behavior, traceability and isOwnLabor (column is_own_labor, ticket #91).
// `amount` is a validated decimal string — never a float — so no money rule
// leaks into the domain.
export const costLineSchema = z.object({
  concept: conceptField,
  amount: amountField,
  behavior: behaviorEnum,
  traceability: traceabilityEnum,
  isOwnLabor: isOwnLaborField,
});

export type CostBehavior = z.infer<typeof behaviorEnum>;
export type CostTraceability = z.infer<typeof traceabilityEnum>;
export type CostLineInput = z.input<typeof costLineSchema>;
export type CostLine = z.infer<typeof costLineSchema>;
