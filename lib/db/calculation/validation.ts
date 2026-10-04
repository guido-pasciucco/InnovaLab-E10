import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import {
  codeString,
  moneyString,
  nameString,
  quantityString,
  uuidString,
} from "../formats";
import {
  calculations,
  computedResults,
  costingSetup,
  pricingInputs,
  scenarios,
} from "./table";
import {
  currencyField,
  periodField,
  unitField,
  volumeField,
} from "@/lib/schemas/calculator-setup/fields";

// ---------------------------------------------------------------------------
// Zod schemas derived from the Drizzle tables (server-side persistence, ADR 0005).
// Rule: the client sends a public input (no ids, no server-owned FKs, no
// timestamps). The server injects server-controlled fields (ownerUserId from
// the session, businessId/calculationId from the route, ids/timestamps from
// the database) before insert.
// ---------------------------------------------------------------------------

// --- Persisted rows: mirror exactly what comes back from the database. ---

export const calculationRowSchema = createSelectSchema(calculations);

export const costingSetupRowSchema = createSelectSchema(costingSetup);

export const pricingInputsRowSchema = createSelectSchema(pricingInputs, {
  expectedMarginPct: quantityString,
  manualPrice: moneyString.nullable(),
});

export const scenarioRowSchema = createSelectSchema(scenarios);

export const computedResultRowSchema = createSelectSchema(computedResults, {
  totalFixed: moneyString,
  variableUnit: moneyString,
  totalCost: moneyString,
  unitCost: moneyString,
  contributionMarginUnit: moneyString,
  breakEvenUnits: quantityString,
  breakEvenSales: moneyString,
  resultsPayload: z.record(z.string(), z.unknown()).nullable(),
});

// --- Public inputs: insert schema minus every server-controlled field. ---

// Starting a calculation only picks the product; the server fills userId and
// businessId (business follows the product) plus status/schemaVersion defaults.
export const createCalculationInputSchema = createInsertSchema(calculations, {
  productId: uuidString,
}).omit({
  id: true,
  userId: true,
  businessId: true,
  status: true,
  schemaVersion: true,
  createdAt: true,
  updatedAt: true,
});

// Business rules come from the shared field atoms in lib/schemas/calculator-setup/fields.ts.
export const upsertCostingSetupInputSchema = createInsertSchema(costingSetup, {
  currency: currencyField,
  period: periodField,
  unit: unitField,
  volume: volumeField,
}).omit({
  calculationId: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertPricingInputsInputSchema = createInsertSchema(pricingInputs, {
  marginConvention: codeString(40),
  expectedMarginPct: quantityString,
  manualPrice: moneyString.nullish(),
}).omit({
  calculationId: true,
  createdAt: true,
  updatedAt: true,
});

export const createScenarioInputSchema = createInsertSchema(scenarios, {
  name: nameString(120),
}).omit({
  id: true,
  calculationId: true,
  createdAt: true,
  updatedAt: true,
});

// No public input schema for computed_results: rows are written by the server
// after running lib/calc, never by the client.

// --- Inferred input/row types: single source of truth, no manual interfaces. ---

export type CalculationRow = z.infer<typeof calculationRowSchema>;
export type CostingSetupRow = z.infer<typeof costingSetupRowSchema>;
export type PricingInputsRow = z.infer<typeof pricingInputsRowSchema>;
export type ScenarioRow = z.infer<typeof scenarioRowSchema>;
export type ComputedResultRow = z.infer<typeof computedResultRowSchema>;

export type CreateCalculationInput = z.infer<typeof createCalculationInputSchema>;
export type UpsertCostingSetupInput = z.infer<typeof upsertCostingSetupInputSchema>;
export type UpsertPricingInputsInput = z.infer<
  typeof upsertPricingInputsInputSchema
>;
export type CreateScenarioInput = z.infer<typeof createScenarioInputSchema>;
