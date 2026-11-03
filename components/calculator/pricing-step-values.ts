import { calculatePricing, markupFromMargin } from "@/lib/calc/calculatePricing";
import { formatARSCompact } from "@/lib/money/format";
import { expectedMarginField } from "@/lib/schemas/calculation/fields";

// The persisted cost summary step 6 prices. Null amounts mean "no costs yet".
export type PricingCosts = {
  unitCost: string | null;
  variableUnit: string | null;
  totalFixed: string | null;
  volume: number | null;
};

export type PricingStepValues = {
  // The margin as the server expects it ("12.5"), or null when it is invalid.
  marginValue: string | null;
  marginIssue: string | null;
  // The margin as the helper text shows it ("12,5").
  marginLabel: string;
  // The equivalent markup on cost ("42,9"), or null when the margin is invalid.
  markupLabel: string | null;
  unitCost: string;
  suggestedPrice: string;
  contributionUnit: string;
  estimatedProfit: string;
  profitIsNegative: boolean;
  // Contribution ≤ 0: each sale leaves nothing for the fixed costs.
  lowContribution: boolean;
  missingCosts: boolean;
};

const DASH = "—";

function money(value: string | null | undefined): string {
  if (value === null || value === undefined) return DASH;
  return formatARSCompact(value) || DASH;
}

type CompleteCosts = { [K in keyof PricingCosts]: NonNullable<PricingCosts[K]> };

function completeCosts(costs: PricingCosts | null): CompleteCosts | null {
  if (
    costs === null ||
    costs.unitCost === null ||
    costs.variableUnit === null ||
    costs.totalFixed === null ||
    costs.volume === null
  ) {
    return null;
  }

  return {
    unitCost: costs.unitCost,
    variableUnit: costs.variableUnit,
    totalFixed: costs.totalFixed,
    volume: costs.volume,
  };
}

// Maps the typed margin and the persisted costs to what the step 6 cards show.
// The margin is read the Argentine way (comma as the decimal mark) and checked
// with expectedMarginField, the same rule the server applies; the amounts come
// from the pure engine, so the page and a later results screen cannot disagree.
export function toPricingStepValues(
  costs: PricingCosts | null,
  marginText: string,
): PricingStepValues {
  const normalized = marginText.trim().replace(",", ".");
  const margin = expectedMarginField.safeParse(normalized);
  const marginValue = margin.success ? margin.data : null;
  const marginIssue = margin.success
    ? null
    : (margin.error.issues[0]?.message ?? "El margen no es válido.");

  const markup = marginValue !== null ? markupFromMargin(marginValue) : null;

  const complete = completeCosts(costs);
  const missingCosts = complete === null;

  const pricing =
    complete !== null && marginValue !== null
      ? calculatePricing({ ...complete, marginPct: marginValue })
      : null;
  const priced = pricing?.ok ? pricing : null;

  return {
    marginValue,
    marginIssue,
    marginLabel: (marginValue ?? normalized).replace(".", ","),
    markupLabel: markup?.replace(/\.0$/, "").replace(".", ",") ?? null,
    unitCost: money(costs?.unitCost),
    suggestedPrice: money(priced?.suggestedPrice),
    contributionUnit: money(priced?.contributionUnit),
    estimatedProfit: money(priced?.estimatedProfit),
    profitIsNegative: priced !== null && priced.estimatedProfit.startsWith("-"),
    lowContribution: priced !== null && !priced.hasPositiveContribution,
    missingCosts,
  };
}
