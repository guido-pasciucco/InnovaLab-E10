import "server-only";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import type { SessionUser } from "@/lib/services/auth";
import { getSupplierService, type Supplier } from "@/lib/services/suppliers";

// Guard for the supplier panel: a signed-in account with supplier data.
// Anyone else goes to the emprendedor screens (flow 1).
export async function requireSupplier(): Promise<{ user: SessionUser; supplier: Supplier }> {
  const user = await requireUser();
  const supplier = await getSupplierService(user.id);
  if (!supplier) redirect("/insumos");
  return { user, supplier };
}
