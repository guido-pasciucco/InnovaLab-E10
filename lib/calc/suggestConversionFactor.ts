import Decimal from "decimal.js";

// Suggests how many minimum units one purchase unit contains, so the form can
// fill `conversionFactor` automatically for the common pairs:
//
//   kg → g     1000
//   L  → ml    1000
//   docena → unidad  12
//
// Units outside the table return `null`: the user types the equivalence. When
// both inputs are the same free-text unit ("caja" → "caja") the factor is 1.
// Pure and client-safe: no db, no window.

type UnitInfo = { family: "mass" | "volume" | "count"; toBase: number };

const UNITS: Record<string, UnitInfo> = {
  kg: { family: "mass", toBase: 1000 },
  kilo: { family: "mass", toBase: 1000 },
  kilos: { family: "mass", toBase: 1000 },
  kilogramo: { family: "mass", toBase: 1000 },
  kilogramos: { family: "mass", toBase: 1000 },
  g: { family: "mass", toBase: 1 },
  gr: { family: "mass", toBase: 1 },
  gramo: { family: "mass", toBase: 1 },
  gramos: { family: "mass", toBase: 1 },
  l: { family: "volume", toBase: 1000 },
  lt: { family: "volume", toBase: 1000 },
  litro: { family: "volume", toBase: 1000 },
  litros: { family: "volume", toBase: 1000 },
  ml: { family: "volume", toBase: 1 },
  mililitro: { family: "volume", toBase: 1 },
  mililitros: { family: "volume", toBase: 1 },
  docena: { family: "count", toBase: 12 },
  docenas: { family: "count", toBase: 12 },
  unidad: { family: "count", toBase: 1 },
  unidades: { family: "count", toBase: 1 },
  u: { family: "count", toBase: 1 },
  un: { family: "count", toBase: 1 },
};

function normalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function asFactor(value: Decimal): string {
  const fixed = value.toFixed(4, Decimal.ROUND_HALF_UP);
  if (!fixed.includes(".")) return fixed;
  return fixed.replace(/0+$/, "").replace(/\.$/, "");
}

export function suggestConversionFactor(
  purchaseUnit: string,
  minimumUnit: string,
): string | null {
  const purchase = UNITS[normalize(purchaseUnit)];
  const minimum = UNITS[normalize(minimumUnit)];

  if (purchase && minimum) {
    if (purchase.family !== minimum.family) return null;
    return asFactor(new Decimal(purchase.toBase).dividedBy(minimum.toBase));
  }

  const purchaseText = normalize(purchaseUnit);
  if (purchaseText !== "" && purchaseText === normalize(minimumUnit)) {
    return "1";
  }

  return null;
}
