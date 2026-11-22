import { relations } from "drizzle-orm";

import {
  businesses,
  productIngredients,
  products,
} from "./business/table";
import { businessCostLines } from "./costs/table";
import { profiles } from "./profile/table";
import { supplies } from "./supplies/table";

// ---------------------------------------------------------------------------
// Query relations for the ERD tables, using the stable classic `fields` /
// `references` API. Parents expose `many()`, children expose `one()`. Nothing
// here is imported by domain code (lib/calc, lib/money) or client code.
// ---------------------------------------------------------------------------

export const profilesRelations = relations(profiles, ({ many }) => ({
  businesses: many(businesses),
  supplies: many(supplies),
}));

export const businessesRelations = relations(businesses, ({ many, one }) => ({
  owner: one(profiles, {
    fields: [businesses.ownerUserId],
    references: [profiles.id],
  }),
  products: many(products),
  businessCostLines: many(businessCostLines),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  business: one(businesses, {
    fields: [products.businessId],
    references: [businesses.id],
  }),
  ingredients: many(productIngredients),
}));

export const productIngredientsRelations = relations(
  productIngredients,
  ({ one }) => ({
    product: one(products, {
      fields: [productIngredients.productId],
      references: [products.id],
    }),
    supply: one(supplies, {
      fields: [productIngredients.supplyId],
      references: [supplies.id],
    }),
  }),
);

export const businessCostLinesRelations = relations(
  businessCostLines,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessCostLines.businessId],
      references: [businesses.id],
    }),
  }),
);

export const suppliesRelations = relations(supplies, ({ many, one }) => ({
  user: one(profiles, {
    fields: [supplies.userId],
    references: [profiles.id],
  }),
  ingredients: many(productIngredients),
}));
