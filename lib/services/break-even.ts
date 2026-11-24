import Decimal from "decimal.js";

import {
  calculatePortfolioBreakEven,
  type PortfolioErrorCode,
} from "@/lib/calc/calculatePortfolioBreakEven";
import type {
  BreakEven,
  BreakEvenExcludedProduct,
  BreakEvenRow,
  GetBreakEven,
} from "@/lib/types/break-even";

function emptyResult(
  period: string,
  status: BreakEven["status"],
  totalExpenses: string,
  excluded: BreakEvenExcludedProduct[],
): BreakEven {
  return {
    period,
    status,
    totalExpenses,
    rows: [],
    totals: null,
    excluded,
    hasNegativeContribution: false,
  };
}

function failureStatus(code: PortfolioErrorCode): BreakEven["status"] {
  switch (code) {
    case "NO_PRODUCTS":
      return "no_products";
    case "NO_CAPACITY":
      return "no_capacity";
    case "NO_PRICE":
      return "no_prices";
    case "NO_CONTRIBUTION":
      return "no_break_even";
    case "INVALID_CAPACITY":
    case "INVALID_AMOUNT":
      throw new Error(`Pricing returned invalid break-even input: ${code}`);
  }
}

function wholeQuotas(
  periodFixedCosts: string,
  products: readonly {
    id: string;
    capacity: number;
    variableUnit: string;
    price: string;
  }[],
): Map<string, string> {
  const contributionByCapacity = products.reduce(
    (total, product) =>
      total.plus(
        new Decimal(product.price)
          .minus(product.variableUnit)
          .times(product.capacity),
      ),
    new Decimal(0),
  );

  return new Map(
    products.map((product) => [
      product.id,
      new Decimal(periodFixedCosts)
        .times(product.capacity)
        .div(contributionByCapacity)
        .toFixed(0, Decimal.ROUND_CEIL),
    ]),
  );
}

export const getBreakEvenService: GetBreakEven = async (userId, deps) => {
  const pricing = await deps.getPricing(userId);
  const excluded: BreakEvenExcludedProduct[] = [];
  for (const row of pricing.rows) {
    if (row.capacity === null || row.capacity === 0) {
      excluded.push({ productId: row.productId, name: row.name, reason: "NO_CAPACITY" });
      continue;
    }
    if (row.variableUnit === null) {
      excluded.push({
        productId: row.productId,
        name: row.name,
        reason: "NO_VARIABLE_COST",
      });
      continue;
    }
    if (row.price === null) {
      excluded.push({ productId: row.productId, name: row.name, reason: "NO_PRICE" });
    }
  }

  if (pricing.rows.length === 0) {
    return emptyResult(pricing.period, "no_products", pricing.totalExpenses, excluded);
  }

  const inMix = pricing.rows.filter((row) => row.capacity !== null && row.capacity !== 0);
  if (inMix.length === 0) {
    return emptyResult(pricing.period, "no_capacity", pricing.totalExpenses, excluded);
  }
  if (new Decimal(pricing.totalExpenses).isZero()) {
    return emptyResult(pricing.period, "no_expenses", pricing.totalExpenses, excluded);
  }
  if (inMix.every((row) => row.price === null)) {
    return emptyResult(pricing.period, "no_prices", pricing.totalExpenses, excluded);
  }
  if (inMix.some((row) => row.variableUnit === null || row.price === null)) {
    return emptyResult(pricing.period, "incomplete", pricing.totalExpenses, excluded);
  }

  const products = inMix.map((row) => ({
    id: row.productId,
    name: row.name,
    capacity: row.capacity as number,
    variableUnit: row.variableUnit as string,
    price: row.price as string,
  }));
  const result = calculatePortfolioBreakEven({
    periodFixedCosts: pricing.totalExpenses,
    products,
  });

  if (!result.ok) {
    return emptyResult(
      pricing.period,
      failureStatus(result.code),
      pricing.totalExpenses,
      excluded,
    );
  }

  const quotas = wholeQuotas(pricing.totalExpenses, products);
  const inputsById = new Map(products.map((product) => [product.id, product]));
  const rows: BreakEvenRow[] = result.products.map((row) => {
    const input = inputsById.get(row.id);
    if (!input) {
      throw new Error(`Break-even engine returned an unknown product: ${row.id}`);
    }

    return {
      ...row,
      breakEvenUnitsWhole: quotas.get(row.id) as string,
      hasNegativeContribution: new Decimal(input.price).lt(input.variableUnit),
    };
  });

  return {
    period: pricing.period,
    status: "ready",
    totalExpenses: pricing.totalExpenses,
    rows,
    totals: result.totals,
    excluded,
    hasNegativeContribution: result.hasNegativeContribution,
  };
};
