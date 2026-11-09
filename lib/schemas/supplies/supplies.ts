import { z } from "zod";

import { purchasePriceField, supplyNameField } from "./fields";

// Form contract (client only): RHF validates with it before submitting.
// Field rules and messages come from ./fields, once. The server never uses this
// contract: the service validates with lib/db/supplies/validation.ts, built
// from the same fields, so its ZodError carries the same messages.
export const supplySchema = z.object({
  name: supplyNameField,
  purchasePrice: purchasePriceField,
});

// Single source of truth: the type is inferred from the schema, no hand-written
// interface to keep in sync.
export type Supply = z.infer<typeof supplySchema>;

// Shape the client needs for list/edit/delete. Superset-compatible with the
// DB row (SupplyRow) but defined here so client components never import lib/db.
export type SupplyItem = {
  id: string;
  name: string;
  purchasePrice: string;
};
