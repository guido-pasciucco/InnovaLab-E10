import { BreakEvenChart } from "@/components/break-even/break-even-chart";
import { BreakEvenScreen } from "@/components/break-even/break-even-screen";
import { toBreakEvenView } from "@/components/break-even/break-even-values";
import { requireUser } from "@/lib/auth/require-user";
import { buildBreakEvenChart } from "@/lib/calc/buildBreakEvenChart";
import { getBreakEvenService } from "@/lib/services/break-even";
import { getPricingService } from "@/lib/services/pricing";

// Protected break-even screen (#246). The session is validated server-side and
// the pricing service filters by that user's business. Every figure is derived
// on each read; nothing is stored. The chart (#247) only renders when the
// status is "ready": buildBreakEvenChart returns null otherwise.
export default async function BreakEvenPage() {
  const user = await requireUser();
  const breakEven = await getBreakEvenService(user.id, {
    getPricing: (userId) => getPricingService(userId),
  });
  const chartData = buildBreakEvenChart(breakEven);

  return (
    <BreakEvenScreen
      view={toBreakEvenView(breakEven)}
      chart={chartData ? <BreakEvenChart data={chartData} /> : undefined}
    />
  );
}
