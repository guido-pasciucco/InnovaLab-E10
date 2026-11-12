import { z } from "zod";

import {
  conversionFactorField,
  minimumUnitField,
  purchasePriceField,
  purchaseQuantityField,
  purchaseUnitField,
  supplyKindField,
  supplyNameField,
  type SupplyKind,
} from "./fields";

// Form contract (client only): RHF validates with it before submitting.
// Field rules and messages come from ./fields, once. The server never uses this
// contract: the service validates with lib/db/supplies/validation.ts, built
// from the same fields, so its ZodError carries the same messages.
//
// Insunos and packaging share one table and one form. `kind` is the only
// difference: the form switches tabs without a second contract.
export const supplySchema = z.object({
  kind: supplyKindField,
  name: supplyNameField,
  purchasePrice: purchasePriceField,
  purchaseQuantity: purchaseQuantityField,
  purchaseUnit: purchaseUnitField,
  minimumUnit: minimumUnitField,
  conversionFactor: conversionFactorField,
});

// Single source of truth: the type is inferred from the schema, no hand-written
// interface to keep in sync.
export type Supply = z.infer<typeof supplySchema>;

// Shape the client needs for list/edit/delete. Superset-compatible with the
// DB row (SupplyRow) but defined here so client components never import lib/db.
export type SupplyItem = {
  id: string;
  kind: SupplyKind;
  name: string;
  purchasePrice: string;
  purchaseQuantity: string;
  purchaseUnit: string;
  minimumUnit: string;
  conversionFactor: string;
};
