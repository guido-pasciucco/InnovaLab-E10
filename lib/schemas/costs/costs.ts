import { z } from "zod";

import {
  amountField,
  behaviorField,
  conceptField,
  isOwnLaborField,
  traceabilityField,
} from "./fields";

// Form contract. Keys match the calc_cost_lines columns: concept, amount,
// behavior and traceability. `isOwnLabor` is forward-looking: the column
// `is_own_labor` comes with #91's migration and does not exist yet, so a
// form wired today would silently drop it. The contract owns the field rule
// so the column can plug in without renaming; the db validation wires it
// when the migration lands.
//
// These types (`CalcCostLine`, `CostBehavior`, `CostTraceability`) are
// scaffolding for the form ticket: they have no consumers outside tests yet.
// Keep them until a real consumer appears, then move them to the domain.
//
// `amount` is a validated decimal string — never a float — so no money rule
// leaks into the domain.
//
// The dimensions are independent: the user answers each one separately, and
// no refinement crosses them (decision confirmed 2026-10-17).
export const calcCostLineSchema = z.object({
  concept: conceptField,
  amount: amountField,
  behavior: behaviorField,
  traceability: traceabilityField,
  isOwnLabor: isOwnLaborField,
});

export type CostBehavior = z.infer<typeof behaviorField>;
export type CostTraceability = z.infer<typeof traceabilityField>;
export type CalcCostLine = z.infer<typeof calcCostLineSchema>;
