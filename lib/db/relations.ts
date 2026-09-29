import { relations } from "drizzle-orm";

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
// Evaluation spike only: query relations for the ERD tables, using the stable
// classic `fields` / `references` API. Parents expose `many()`, children
// expose `one()`. Nothing here is imported by domain code (lib/calc,
// lib/money) or any route.
// ---------------------------------------------------------------------------

export const profilesRelations = relations(profiles, ({ many }) => ({
  businesses: many(businesses),
  calculations: many(calculations),
}));

export const businessesRelations = relations(businesses, ({ many, one }) => ({
  owner: one(profiles, {
    fields: [businesses.ownerUserId],
    references: [profiles.id],
  }),
  products: many(products),
  businessCostLines: many(businessCostLines),
  calculations: many(calculations),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  business: one(businesses, {
    fields: [products.businessId],
    references: [businesses.id],
  }),
  calculations: many(calculations),
}));

export const businessCostLinesRelations = relations(
  businessCostLines,
  ({ many, one }) => ({
    business: one(businesses, {
      fields: [businessCostLines.businessId],
      references: [businesses.id],
    }),
    // Snapshot lines derived from this template.
    calcCostLines: many(calcCostLines),
  }),
);

export const calculationsRelations = relations(
  calculations,
  ({ many, one }) => ({
    user: one(profiles, {
      fields: [calculations.userId],
      references: [profiles.id],
    }),
    business: one(businesses, {
      fields: [calculations.businessId],
      references: [businesses.id],
    }),
    product: one(products, {
      fields: [calculations.productId],
      references: [products.id],
    }),
    // 1:1 children sharing the calculation PK.
    costingSetup: one(costingSetup),
    pricingInputs: one(pricingInputs),
    scenarios: many(scenarios),
    calcCostLines: many(calcCostLines),
    computedResults: many(computedResults),
  }),
);

export const costingSetupRelations = relations(costingSetup, ({ one }) => ({
  calculation: one(calculations, {
    fields: [costingSetup.calculationId],
    references: [calculations.id],
  }),
}));

export const pricingInputsRelations = relations(pricingInputs, ({ one }) => ({
  calculation: one(calculations, {
    fields: [pricingInputs.calculationId],
    references: [calculations.id],
  }),
}));

export const scenariosRelations = relations(scenarios, ({ many, one }) => ({
  calculation: one(calculations, {
    fields: [scenarios.calculationId],
    references: [calculations.id],
  }),
  calcCostLines: many(calcCostLines),
  computedResults: many(computedResults),
}));

export const calcCostLinesRelations = relations(calcCostLines, ({ one }) => ({
  calculation: one(calculations, {
    fields: [calcCostLines.calculationId],
    references: [calculations.id],
  }),
  // Optional: lines can live at calculation level, outside any scenario.
  scenario: one(scenarios, {
    fields: [calcCostLines.scenarioId],
    references: [scenarios.id],
  }),
  sourceBusinessCostLine: one(businessCostLines, {
    fields: [calcCostLines.sourceBusinessCostId],
    references: [businessCostLines.id],
  }),
}));

export const computedResultsRelations = relations(
  computedResults,
  ({ one }) => ({
    calculation: one(calculations, {
      fields: [computedResults.calculationId],
      references: [calculations.id],
    }),
    // Optional: a result row can cover the whole calculation.
    scenario: one(scenarios, {
      fields: [computedResults.scenarioId],
      references: [scenarios.id],
    }),
  }),
);
