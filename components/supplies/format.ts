// Shared display formats for the supplies catalog. The values are decimal
// strings; Number() is used only for presentation, never for arithmetic.

export const moneyFormat = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// The cost per minimum unit can need more than 2 decimals (e.g. $0,006/g).
export const unitPriceFormat = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export const quantityFormat = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 4,
});

// The database returns numeric columns at their full scale ("25.0000"), so
// editing shows the same value the user typed instead of a padded one.
export function trimDecimalZeros(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/0+$/, "").replace(/\.$/, "");
}
