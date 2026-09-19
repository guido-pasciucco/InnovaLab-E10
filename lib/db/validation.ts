import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import {
  businessCostLines,
  businesses,
  calcCostLines,
  calculations,
  computedResults,
  costingSetup,
  pricingInputs,
  products,
  profiles,
  scenarios,
} from "./schema";

// ---------------------------------------------------------------------------
// Evaluation spike only: Zod schemas derived from the Drizzle tables.
// Rule: the client sends a public input (no ids, no server-owned FKs, no
// timestamps). The server injects server-controlled fields (ownerUserId from
// the session, businessId/calculationId from the route, ids/timestamps from
// the database) before insert.
//
// Numeric columns arrive as decimal strings (Drizzle maps `numeric` to
// `string` in TypeScript): money with up to 2 decimals, quantities/rates/
// percentages with up to 4 decimals. Mapping to the pure domain in
// lib/money happens at the application boundary.
// ---------------------------------------------------------------------------

const uuidString = z.string().uuid();

const moneyString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Expected a decimal string with up to 2 decimals");

const quantityString = z
  .string()
  .regex(
    /^-?\d+(\.\d{1,4})?$/,
    "Expected a decimal string with up to 4 decimals",
  );

const nameString = (max: number) => z.string().trim().min(1).max(max);
const codeString = (max: number) => z.string().trim().min(1).max(max);

// --- Persisted rows: mirror exactly what comes back from the database. ---

export const profileRowSchema = createSelectSchema(profiles);

export const businessRowSchema = createSelectSchema(businesses);

export const productRowSchema = createSelectSchema(products);

export const businessCostLineRowSchema = createSelectSchema(businessCostLines, {
  amountPeriod: moneyString,
});

export const calculationRowSchema = createSelectSchema(calculations);

export const costingSetupRowSchema = createSelectSchema(costingSetup, {
  estimatedVolume: quantityString,
});

export const pricingInputsRowSchema = createSelectSchema(pricingInputs, {
  expectedMarginPct: quantityString,
  manualPrice: moneyString.nullable(),
});

export const scenarioRowSchema = createSelectSchema(scenarios);

export const calcCostLineRowSchema = createSelectSchema(calcCostLines, {
  amount: moneyString,
  hours: quantityString.nullable(),
  hourlyRate: quantityString.nullable(),
  allocationPct: quantityString.nullable(),
});

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

export const createBusinessInputSchema = createInsertSchema(businesses, {
  name: nameString(120),
  businessType: codeString(80),
}).omit({
  id: true,
  ownerUserId: true,
  createdAt: true,
});

export const createProductInputSchema = createInsertSchema(products, {
  name: nameString(120),
  skuOrSlug: z.string().trim().min(1).max(120).nullish(),
}).omit({
  id: true,
  businessId: true,
  createdAt: true,
  updatedAt: true,
});

export const createBusinessCostLineInputSchema = createInsertSchema(
  businessCostLines,
  {
    concept: nameString(200),
    behavior: codeString(40),
    traceability: codeString(40),
    amountPeriod: moneyString,
    notes: z.string().trim().max(500).nullish(),
  },
).omit({
  id: true,
  businessId: true,
  createdAt: true,
  updatedAt: true,
});

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

export const upsertCostingSetupInputSchema = createInsertSchema(costingSetup, {
  currency: codeString(8),
  costingPeriod: codeString(40),
  costingUnit: codeString(40),
  estimatedVolume: quantityString,
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

export const createCalcCostLineInputSchema = createInsertSchema(calcCostLines, {
  scenarioId: uuidString.nullish(),
  sourceBusinessCostId: uuidString,
  concept: nameString(200),
  behavior: codeString(40),
  traceability: codeString(40),
  amount: moneyString,
  hours: quantityString.nullish(),
  hourlyRate: quantityString.nullish(),
  allocationPct: quantityString.nullish(),
}).omit({
  id: true,
  calculationId: true,
  createdAt: true,
  updatedAt: true,
});

// No public input schemas for profiles (rows mirror Supabase Auth, created
// server-side) or computed_results (rows are written by the server after
// running lib/calc, never by the client).

// --- Inferred input/row types: single source of truth, no manual interfaces. ---

export type ProfileRow = z.infer<typeof profileRowSchema>;
export type BusinessRow = z.infer<typeof businessRowSchema>;
export type ProductRow = z.infer<typeof productRowSchema>;
export type BusinessCostLineRow = z.infer<typeof businessCostLineRowSchema>;
export type CalculationRow = z.infer<typeof calculationRowSchema>;
export type CostingSetupRow = z.infer<typeof costingSetupRowSchema>;
export type PricingInputsRow = z.infer<typeof pricingInputsRowSchema>;
export type ScenarioRow = z.infer<typeof scenarioRowSchema>;
export type CalcCostLineRow = z.infer<typeof calcCostLineRowSchema>;
export type ComputedResultRow = z.infer<typeof computedResultRowSchema>;

export type CreateBusinessInput = z.infer<typeof createBusinessInputSchema>;
export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type CreateBusinessCostLineInput = z.infer<
  typeof createBusinessCostLineInputSchema
>;
export type CreateCalculationInput = z.infer<typeof createCalculationInputSchema>;
export type UpsertCostingSetupInput = z.infer<typeof upsertCostingSetupInputSchema>;
export type UpsertPricingInputsInput = z.infer<
  typeof upsertPricingInputsInputSchema
>;
export type CreateScenarioInput = z.infer<typeof createScenarioInputSchema>;
export type CreateCalcCostLineInput = z.infer<typeof createCalcCostLineInputSchema>;
