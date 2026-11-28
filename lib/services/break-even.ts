import Decimal from "decimal.js";

import {
  calculatePortfolioBreakEven,
  type PortfolioErrorCode,
} from "@/lib/calc/calculatePortfolioBreakEven";
import { AppError } from "@/lib/errors/app-error";
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
      throw new AppError("CALC_BREAK_EVEN_FAILED", { reason: code });
  }
}


export const getBreakEvenService: GetBreakEven = async (userId, deps) => {
  const pricing = await deps.getPricing(userId);
  const excluded: BreakEvenExcludedProduct[] = [];
  for (const row of pricing.rows) {
    if (row.capacity === null || row.capacity === 0) {
      excluded.push({
        rowId: row.rowId,
        productId: row.productId,
        name: row.name,
        reason: "NO_CAPACITY",
        editHref: row.editHref,
      });
      continue;
    }
    if (row.variableUnit === null) {
      excluded.push({
        rowId: row.rowId,
        productId: row.productId,
        name: row.name,
        reason: "NO_VARIABLE_COST",
      });
      continue;
    }
    if (row.price === null) {
      excluded.push({
        rowId: row.rowId,
        productId: row.productId,
        name: row.name,
        reason: "NO_PRICE",
      });
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
    id: row.rowId,
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

  // The engine returns every figure, whole quotas included: the service only
  // flags the rows that sell at or below their variable cost (contribution ≤ 0).
  const rows: BreakEvenRow[] = result.products.map((row) => ({
    ...row,
    hasNegativeContribution: new Decimal(row.contributionUnit).lte(0),
  }));

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
