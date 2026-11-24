import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { getHomePathService } from "@/lib/services/suppliers";

// Landing after sign-in: an emprendedor goes to flow 1 (/insumos) and a
// supplier account without a business of its own goes to its panel
// (docs/flujos/09-licitaciones.md N-09).
export default async function HomeRedirectPage() {
  const user = await requireUser();
  redirect(await getHomePathService(user.id));
}
