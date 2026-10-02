import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { codeString, nameString } from "../formats";
import { businesses, products } from "./table";
import { productNameField } from "@/lib/schemas/calculator-setup/fields";

// ---------------------------------------------------------------------------
// Evaluation spike only: Zod schemas derived from the Drizzle tables.
// Rule: the client sends a public input (no ids, no server-owned FKs, no
// timestamps). The server injects server-controlled fields (ownerUserId from
// the session, businessId/calculationId from the route, ids/timestamps from
// the database) before insert.
// ---------------------------------------------------------------------------

// --- Persisted rows: mirror exactly what comes back from the database. ---

export const businessRowSchema = createSelectSchema(businesses);

export const productRowSchema = createSelectSchema(products);

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
  name: productNameField,
  skuOrSlug: z.string().trim().min(1).max(120).nullish(),
}).omit({
  id: true,
  businessId: true,
  createdAt: true,
  updatedAt: true,
});

// --- Inferred input/row types: single source of truth, no manual interfaces. ---

export type BusinessRow = z.infer<typeof businessRowSchema>;
export type ProductRow = z.infer<typeof productRowSchema>;

export type CreateBusinessInput = z.infer<typeof createBusinessInputSchema>;
export type CreateProductInput = z.infer<typeof createProductInputSchema>;
