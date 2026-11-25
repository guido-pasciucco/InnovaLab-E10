// Single source for every number shown on the public calculator page.
// The figures come from the same engine the private /precios and /equilibrio
// pages use, so the marketing copy cannot drift from the app.
//
// Harina $ 1.000/kg, receta de 1 kg que rinde 10 → $ 100 de costo variable por
// alfajor. Caja $ 300. Unidad: 100 alfajores/mes. Caja x6: 50 cajas/mes.
// Gastos del mes $ 30.000 y recargo del 50 % (precio = costo total × 1,5).

import { calculatePortfolioBreakEven } from "@/lib/calc/calculatePortfolioBreakEven";
import { formatARS } from "@/lib/money/format";

export const referenceInput = {
  periodFixedCosts: "30000",
  products: [
    {
      id: "alfajor-unidad",
      name: "Alfajor · Unidad",
      capacity: 100,
      variableUnit: "100",
      price: "450",
    },
    {
      id: "alfajor-caja",
      name: "Alfajor · Caja x6",
      capacity: 50,
      variableUnit: "900",
      price: "1650",
    },
  ],
} as const;

const result = calculatePortfolioBreakEven(referenceInput);

// The example is a fixture: a failure here means the marketing numbers would
// be wrong, so fail loudly at module load instead of rendering placeholders.
if (!result.ok) {
  throw new Error(`Invalid calculator reference example: ${result.code}`);
}

const spanishDecimal = (value: string) => value.replace(".", ",");

export const referenceRows = result.products.map((product) => ({
  name: product.name,
  variableUnit: formatARS(product.variableUnit),
  indirectUnit: formatARS(product.indirectUnit),
  unitCost: formatARS(product.unitCost),
  price: formatARS(product.price),
  contribution: formatARS(product.contributionUnit),
  exactUnits: spanishDecimal(product.breakEvenUnits),
  wholeUnits: product.breakEvenUnitsWhole,
}));

export const referenceTotals = {
  fixedCosts: formatARS(result.totals.periodFixedCosts),
  breakEvenSales: formatARS(result.totals.breakEvenSales),
  closingContribution: formatARS(result.totals.closingContribution),
  weightedPrice: Number(result.totals.weightedPrice),
  weightedContribution: Number(result.totals.weightedContribution),
  breakEvenUnits: Number(result.totals.breakEvenUnits),
};
