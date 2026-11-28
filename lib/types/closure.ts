// Contract of a monthly calculation closure (#322). A closure is an append-only
// photo: it keeps the inputs the user saw and the results the live services
// returned at that moment. Nothing in here is recomputed when the catalog
// changes, so historical figures never move.
//
// The services' result types are reused instead of duplicated: the snapshot is
// exactly what getCostDistributionService, getPricingService and
// getBreakEvenService returned at closing time.

import type { CostDistribution } from "@/lib/services/cost-distribution";

import type { BreakEven } from "./break-even";
import type { Pricing } from "./pricing";

// Bump when the shape of the snapshot changes in a way the history view must
// be able to tell apart (for example, when pricing rows become presentations).
export const CLOSURE_SNAPSHOT_SCHEMA_VERSION = 1;

export type ClosureSupply = {
  id: string;
  name: string;
  kind: "supply" | "packaging";
  unit: string;
  price: string;
};

export type ClosureRecipeItem = {
  supplyId: string;
  supplyName: string;
  quantity: string;
  unit: string;
};

export type ClosurePackagingItem = ClosureRecipeItem;

export type ClosurePresentation = {
  id: string;
  name: string;
  unitsPerPresentation: string;
  // Optional so photos saved before per-presentation markup was stored stay readable.
  ownMarkupPercent?: string | null;
  packaging: ClosurePackagingItem[];
};

export type ClosureProduct = {
  id: string;
  name: string;
  recipe: ClosureRecipeItem[];
  yieldQuantity: string | null;
  monthlyCapacity: number | null;
  ownMarkupPercent: string | null;
  presentations: ClosurePresentation[];
};

export type ClosurePeriodCostLine = {
  id: string;
  concept: string;
  amountPeriod: string;
};

export type ClosureInputs = {
  supplies: ClosureSupply[];
  products: ClosureProduct[];
  periodCostLines: ClosurePeriodCostLine[];
  defaultMarkupPercent: string | null;
};

export type ClosureResults = {
  costDistribution: CostDistribution;
  pricing: Pricing;
  breakEven: BreakEven;
};

export type ClosureSnapshot = {
  period: string;
  inputs: ClosureInputs;
  results: ClosureResults;
};

// A line of the audit section: what changed between two consecutive versions
// of the same month. `key` is the stable field id (also the React key) and
// `kind` tells the view how to render the values without guessing from `label`.
// `changedAt` is the date of the newer closure.
export type ClosureChangeKind = "money" | "percent" | "count" | "text";

export type ClosureChange = {
  key: string;
  label: string;
  before: string;
  after: string;
  kind: ClosureChangeKind;
  changedAt: string;
};
