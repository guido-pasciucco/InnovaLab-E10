import { PeriodCostsScreen } from "@/components/period-costs/period-costs-screen";
import { requireUser } from "@/lib/auth/require-user";
import { listPeriodCostsService } from "@/lib/services/business-cost";

// Protected page: the session is validated server-side and the service filters
// the lines by the business of that user. Reading the period again is what
// makes the total survive a reload: it is derived from the saved lines, never
// kept in client state (#243).
export default async function PeriodCostsPage() {
  const user = await requireUser();
  const { period, lines, total } = await listPeriodCostsService(user.id);
  // Only the fields the screen shows cross to the client; the rest of the row
  // stays on the server.
  const periodLines = lines.map(({ id, concept, amountPeriod }) => ({
    id,
    concept,
    amountPeriod,
  }));

  return <PeriodCostsScreen period={period} lines={periodLines} total={total} />;
}
