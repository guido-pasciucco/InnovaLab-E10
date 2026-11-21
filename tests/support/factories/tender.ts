import type { VerifiedUserId } from "@/lib/services/auth";
import { createSupplierInviteService, registerSupplierService } from "@/lib/services/suppliers";
import { createSupplyService } from "@/lib/services/supplies";

import { buildSupplierProfile } from "./supplier";
import { createUser, type CreatedUser } from "./user";

// The services' db parameter, typed without importing lib/db (lint rule).
type Db = NonNullable<Parameters<typeof createSupplyService>[2]>;

// Arranges the parties of a tender through the real services: an emprendedor
// with catalog supplies and suppliers linked to them. `track` receives every
// created user so the test can delete them afterwards.

export async function createSupply(
  ownerId: VerifiedUserId,
  name: string,
  db: Db,
  price = { purchasePrice: "18750.00", purchaseQuantity: "25", purchaseUnit: "kg" },
) {
  return createSupplyService(
    ownerId,
    { kind: "supply", name, minimumUnit: "g", conversionFactor: "1000", ...price },
    db,
  );
}

export async function createLinkedSupplier(
  owner: CreatedUser,
  db: Db,
  track: (user: CreatedUser) => void,
  businessName = "Molino San José",
): Promise<CreatedUser> {
  const supplier = await createUser();
  track(supplier);
  const { token } = await createSupplierInviteService(owner.id, { label: businessName }, db);
  await registerSupplierService(supplier.id, supplier.email, token, buildSupplierProfile({ businessName }), db);
  return supplier;
}
