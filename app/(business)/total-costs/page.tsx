import { CostDistributionScreen } from "@/components/cost-distribution/cost-distribution-screen";
import { toCostDistributionView } from "@/components/cost-distribution/cost-distribution-values";
import { requireUser } from "@/lib/auth/require-user";
import { getCostDistributionService } from "@/lib/services/cost-distribution";

// Protected page: the session is validated server-side and the service filters
// the expenses and the products by the business of that user. The figures are
// derived on every read from the saved data, never kept in client state, so an
// edit to a capacity or an expense shows up the next time the page loads (#244).
export default async function TotalCostsPage() {
  const user = await requireUser();
  const distribution = await getCostDistributionService(user.id);

  return (
    <CostDistributionScreen
      view={toCostDistributionView(distribution)}
      hasProducts={distribution.rows.length > 0}
    />
  );
}
