import Decimal from "decimal.js";

// Pure multi-product break-even for the catalog dashboard (#246 / #247).
// The dashboard is read-only: it shows the numbers this engine derives from
// the live catalog, the period expenses and the suggested prices.
//
//   mix_i               = capacity_i / Σ capacity
//   indirectUnit        = periodFixedCosts / Σ capacity      (same for every product)
//   unitCost_i          = variableUnit_i + indirectUnit       (#244 total unit cost)
//   contribution_i      = price_i - variableUnit_i
//   weightedContribution = Σ (mix_i × contribution_i)
//   breakEvenUnits      = periodFixedCosts / weightedContribution
//   quota_i             = breakEvenUnits × mix_i
//   breakEvenSales_i    = quota_i × price_i
//   breakEvenSales      = Σ breakEvenSales_i = periodFixedCosts / contributionRatio
//   closing check       = Σ (quota_i × contribution_i) = periodFixedCosts
//
// Capacity is the monthly production the business plans (#242) and it is the
// only proration driver: every product absorbs indirects in proportion to its
// capacity, so the indirect cost per unit is identical for all of them. That
// is counterintuitive, but it is the rule agreed in the phase-2 flow (D9).
//
// Products with capacity 0 do not absorb indirects and cannot have a quota
// (D9): they are returned as `excludedProductIds` so the caller can show the
// missing-capacity warning instead of dropping them silently.
//
// Money and quantities stay Decimals until they leave the function. Every
// returned amount is rounded once, from full precision, with ROUND_HALF_UP:
// rounding the mix or the units first would drift the closing check.
// The margin is measured on the selling price (decision D29):
//
//   marginPct_i = (price_i - unitCost_i) / price_i × 100

const FINAL_MONEY_DECIMALS = 2;
const FINAL_MONEY_ROUNDING = Decimal.ROUND_HALF_UP;
// Percentages and weighted per-unit averages keep 4 decimals, like numeric(14,4).
const FINAL_FRACTION_DECIMALS = 4;
const FINAL_UNITS_DECIMALS = 4;
const FINAL_RATIO_DECIMALS = 6;
const HUNDRED = new Decimal(100);

export type MoneyString = string;

export type PortfolioProductInput = {
  id: string;
  name: string;
  // Units the business plans to make this month. Must be a non-negative
  // integer: 0 means "not loaded yet" and excludes the product from the mix.
  capacity: number;
  // CVU: recipe cost divided by the recipe yield (#241). Indirects excluded.
  variableUnit: string;
  // Suggested selling price, resolved by the pricing service (#312). Must be > 0.
  price: string;
};

export type PortfolioInput = {
  products: readonly PortfolioProductInput[];
  // Σ business_cost_lines.amount_period for the period (#243).
  periodFixedCosts: string;
};

export type PortfolioErrorCode =
  | "NO_PRODUCTS"
  | "NO_CAPACITY"
  | "NO_PRICE"
  | "NO_CONTRIBUTION"
  | "INVALID_CAPACITY"
  | "INVALID_AMOUNT";

export type PortfolioProduct = {
  id: string;
  name: string;
  capacity: number;
  // Share of the total capacity, in percent ("33.3333").
  mixPct: string;
  variableUnit: MoneyString;
  indirectUnit: MoneyString;
  unitCost: MoneyString;
  // Indirect cost the product absorbs for the whole period.
  fixedShare: MoneyString;
  price: MoneyString;
  contributionUnit: MoneyString;
  // Margin on the selling price, in percent ("25.0000"). Negative when the
  // price does not cover the total unit cost.
  marginPct: string;
  // Units of this product at the break-even, exact at 4 decimals ("37.5000").
  breakEvenUnits: string;
  // Whole units of this product to sell, rounded up from the unrounded quota
  // ("38"). Rounding the 4-decimal value instead would turn 100.00001 into 100.
  breakEvenUnitsWhole: string;
  breakEvenSales: MoneyString;
};

export type PortfolioTotals = {
  // Σ capacity of the products that took part in the proration.
  capacity: number;
  periodFixedCosts: MoneyString;
  indirectUnit: MoneyString;
  // Weighted contribution per mix unit, at 4 decimals ("666.6667").
  weightedContribution: string;
  // Weighted price per mix unit, at 4 decimals ("1616.6667").
  weightedPrice: string;
  // Δ contribution per peso sold ("0.412371"). Multiply by the general sales
  // of a chart x-axis to get the contribution at that point.
  contributionRatio: string;
  // Exact units at 4 decimals ("225.0000").
  breakEvenUnits: string;
  // Whole units to sell, rounded up ("225"): a fraction of a product cannot
  // be sold.
  breakEvenUnitsWhole: string;
  breakEvenSales: MoneyString;
  // Σ (quota × contribution). Equals periodFixedCosts when nothing is rounded.
  closingContribution: MoneyString;
};

type PortfolioSuccess = {
  ok: true;
  products: readonly PortfolioProduct[];
  totals: PortfolioTotals;
  // Products left out because their capacity is 0 (D9).
  excludedProductIds: readonly string[];
  // At least one product sells at or below its variable cost (contribution
  // ≤ 0). It does not abort the calculation: the dashboard shows a warning.
  hasNegativeContribution: boolean;
};

type PortfolioFailure = { ok: false; code: PortfolioErrorCode };

export type PortfolioResult = PortfolioSuccess | PortfolioFailure;

function parseDecimal(raw: string): Decimal | undefined {
  try {
    const value = new Decimal(raw.trim());
    return value.isFinite() ? value : undefined;
  } catch {
    return undefined;
  }
}

function asMoney(value: Decimal): MoneyString {
  return value.toFixed(FINAL_MONEY_DECIMALS, FINAL_MONEY_ROUNDING);
}

function asFourDecimals(value: Decimal): string {
  return value.toFixed(FINAL_FRACTION_DECIMALS, FINAL_MONEY_ROUNDING);
}

function asUnits(value: Decimal): string {
  return value.toFixed(FINAL_UNITS_DECIMALS, FINAL_MONEY_ROUNDING);
}

export function calculatePortfolioBreakEven(input: PortfolioInput): PortfolioResult {
  if (input.products.length === 0) {
    return { ok: false, code: "NO_PRODUCTS" };
  }

  const included: PortfolioProductInput[] = [];
  const excludedProductIds: string[] = [];

  for (const product of input.products) {
    if (!Number.isInteger(product.capacity) || product.capacity < 0) {
      return { ok: false, code: "INVALID_CAPACITY" };
    }
    if (product.capacity === 0) {
      excludedProductIds.push(product.id);
    } else {
      included.push(product);
    }
  }

  // D9: without capacity there is nothing to prorate. The caller shows the
  // missing-capacity state, not a crash.
  if (included.length === 0) {
    return { ok: false, code: "NO_CAPACITY" };
  }

  const periodFixedCosts = parseDecimal(input.periodFixedCosts);
  if (periodFixedCosts === undefined || periodFixedCosts.lt(0)) {
    return { ok: false, code: "INVALID_AMOUNT" };
  }

  type ParsedProduct = {
    product: PortfolioProductInput;
    price: Decimal;
    variableUnit: Decimal;
  };

  const parsed: ParsedProduct[] = [];
  for (const product of included) {
    const price = parseDecimal(product.price);
    // An empty price is "not loaded"; anything else that cannot be parsed is
    // a malformed amount. Both block the dashboard, with different messages.
    if (price === undefined) {
      return {
        ok: false,
        code: product.price.trim() === "" ? "NO_PRICE" : "INVALID_AMOUNT",
      };
    }
    if (price.lte(0)) {
      return { ok: false, code: "NO_PRICE" };
    }

    const variableUnit = parseDecimal(product.variableUnit);
    if (variableUnit === undefined || variableUnit.lt(0)) {
      return { ok: false, code: "INVALID_AMOUNT" };
    }

    parsed.push({ product, price, variableUnit });
  }

  const capacitySum = new Decimal(
    included.reduce((sum, product) => sum + product.capacity, 0),
  );
  const indirectUnit = periodFixedCosts.div(capacitySum);

  let weightedContribution = new Decimal(0);
  let weightedPrice = new Decimal(0);
  let hasNegativeContribution = false;

  const rows = parsed.map(({ product, price, variableUnit }) => {
    const mix = new Decimal(product.capacity).div(capacitySum);
    const contribution = price.minus(variableUnit);
    const unitCost = variableUnit.plus(indirectUnit);
    const decrease = price.minus(unitCost);

    if (contribution.lte(0)) {
      hasNegativeContribution = true;
    }

    weightedContribution = weightedContribution.plus(mix.times(contribution));
    weightedPrice = weightedPrice.plus(mix.times(price));

    return {
      product,
      mix,
      price,
      variableUnit,
      contribution,
      unitCost,
      marginPct: decrease.div(price).times(HUNDRED),
      fixedShare: periodFixedCosts.times(mix),
    };
  });

  // With a contribution of 0 no unit leaves anything for the fixed costs, so
  // there is no break-even. Negative contributions are allowed per product as
  // long as the mix still contributes as a whole.
  if (weightedContribution.lte(0)) {
    return { ok: false, code: "NO_CONTRIBUTION" };
  }

  const breakEvenUnitsTotal = periodFixedCosts.div(weightedContribution);

  const products: PortfolioProduct[] = rows.map((row) => {
    const quota = breakEvenUnitsTotal.times(row.mix);

    return {
      id: row.product.id,
      name: row.product.name,
      capacity: row.product.capacity,
      mixPct: asFourDecimals(row.mix.times(HUNDRED)),
      variableUnit: asMoney(row.variableUnit),
      indirectUnit: asMoney(indirectUnit),
      unitCost: asMoney(row.unitCost),
      fixedShare: asMoney(row.fixedShare),
      price: asMoney(row.price),
      contributionUnit: asMoney(row.contribution),
      marginPct: asFourDecimals(row.marginPct),
      breakEvenUnits: asUnits(quota),
      breakEvenUnitsWhole: quota.toFixed(0, Decimal.ROUND_CEIL),
      breakEvenSales: asMoney(quota.times(row.price)),
    };
  });

  return {
    ok: true,
    products,
    totals: {
      capacity: capacitySum.toNumber(),
      periodFixedCosts: asMoney(periodFixedCosts),
      indirectUnit: asMoney(indirectUnit),
      weightedContribution: asFourDecimals(weightedContribution),
      weightedPrice: asFourDecimals(weightedPrice),
      contributionRatio: weightedContribution
        .div(weightedPrice)
        .toFixed(FINAL_RATIO_DECIMALS, FINAL_MONEY_ROUNDING),
      breakEvenUnits: asUnits(breakEvenUnitsTotal),
      breakEvenUnitsWhole: breakEvenUnitsTotal.toFixed(0, Decimal.ROUND_CEIL),
      // Sales come from the unrounded units, never from the rounded quotas.
      breakEvenSales: asMoney(breakEvenUnitsTotal.times(weightedPrice)),
      closingContribution: asMoney(breakEvenUnitsTotal.times(weightedContribution)),
    },
    excludedProductIds,
    hasNegativeContribution,
  };
}
