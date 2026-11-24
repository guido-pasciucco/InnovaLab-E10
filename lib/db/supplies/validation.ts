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
  SUPPLY_UNIT_CATALOG_MESSAGE,
} from "@/lib/schemas/supplies/fields";
import { getSupplyUnit } from "@/lib/schemas/supplies/units";
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

const supplyInputObjectSchema = createInsertSchema(supplies, supplyInputShape).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// New supplies and packaging must pick a unit from the catalog. Updates cannot enforce this
// here because a legacy row may keep its stored unknown unit; the service
// compares the payload with the persisted row before accepting it.
export const createSupplyInputSchema = supplyInputObjectSchema.superRefine((value, ctx) => {
  const hasValidLength = value.purchaseUnit.length > 0 && value.purchaseUnit.length <= 40;

  if (hasValidLength && getSupplyUnit(value.purchaseUnit) === null) {
    ctx.addIssue({
      code: "custom",
      path: ["purchaseUnit"],
      message: SUPPLY_UNIT_CATALOG_MESSAGE,
    });
  }
});

export const updateSupplyInputSchema = supplyInputObjectSchema;

// --- Inferred input/row types: single source of truth, no manual interfaces. ---

export type SupplyRow = z.infer<typeof supplyRowSchema>;
export type CreateSupplyInput = z.infer<typeof createSupplyInputSchema>;
export type UpdateSupplyInput = z.infer<typeof updateSupplyInputSchema>;
