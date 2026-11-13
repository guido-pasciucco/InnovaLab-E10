import Decimal from "decimal.js";

// Exact decimal sum for money. Keeping it in lib/money avoids duplicating the
// arithmetic in every service that needs a subtotal (calc costs, period
// expenses). Inputs and the result are decimal strings: 0.10 + 0.20 = 0.30.
const MONEY_DECIMALS = 2;

export function sumMoney(amounts: readonly string[]): string {
  const total = amounts.reduce((sum, amount) => sum.plus(amount), new Decimal(0));
  return total.toFixed(MONEY_DECIMALS);
}
