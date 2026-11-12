import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { moneyString, quantityString } from "../formats";
import {
  conversionFactorField,
  minimumUnitField,
  purchasePriceField,
  purchaseQuantityField,
  purchaseUnitField,
  supplyKindField,
  supplyNameField,
} from "@/lib/schemas/supplies/fields";
import { supplies } from "./table";

// ---------------------------------------------------------------------------
// Zod schemas derived from the Drizzle tables (server-side persistence, ADR 02).
// Rule: the client sends a public input (no ids, no server-owned FKs, no
// timestamps). The server injects server-controlled fields (ownerUserId from
// the session, ids/timestamps from the database) before insert.
// ---------------------------------------------------------------------------

// --- Persisted rows: mirror exactly what comes back from the database. ---

export const supplyRowSchema = createSelectSchema(supplies, {
  kind: supplyKindField,
  purchasePrice: moneyString,
  purchaseQuantity: quantityString,
  conversionFactor: quantityString,
});

// --- Public inputs: insert/update schema minus every server-controlled field. ---

const supplyInputShape = {
  kind: supplyKindField,
  name: supplyNameField,
  purchasePrice: purchasePriceField,
  purchaseQuantity: purchaseQuantityField,
  purchaseUnit: purchaseUnitField,
  minimumUnit: minimumUnitField,
  conversionFactor: conversionFactorField,
} as const;

export const createSupplyInputSchema = createInsertSchema(supplies, supplyInputShape).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSupplyInputSchema = createInsertSchema(supplies, supplyInputShape).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// --- Inferred input/row types: single source of truth, no manual interfaces. ---

export type SupplyRow = z.infer<typeof supplyRowSchema>;
export type CreateSupplyInput = z.infer<typeof createSupplyInputSchema>;
export type UpdateSupplyInput = z.infer<typeof updateSupplyInputSchema>;
