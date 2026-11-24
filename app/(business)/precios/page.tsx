import { PricingScreen } from "@/components/pricing/pricing-screen";
import { toPricingView } from "@/components/pricing/pricing-values";
import { requireUser } from "@/lib/auth/require-user";
import { getPricingService } from "@/lib/services/pricing";

// Protected pricing screen (#312). The session is validated server-side and
// the service filters products and markups by that user's business. Price,
// profit and real margin are derived on every read, never stored.
export default async function PricingPage() {
  const user = await requireUser();
  const pricing = await getPricingService(user.id);

  return <PricingScreen initialView={toPricingView(pricing)} />;
}
