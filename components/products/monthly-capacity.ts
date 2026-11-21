// Monthly capacity presentation rules (#269). Pure helpers shared by the form
// (live warning) and the list (column value), so both use the same definition
// of "missing" without duplicating it in the JSX.

export const MONTHLY_CAPACITY_LABEL =
  "¿Cuántas unidades pensás fabricar este mes?";

export const MONTHLY_CAPACITY_WARNING =
  "Sin capacidad mensual este producto no entra en el reparto de gastos ni muestra precio sugerido.";

export const MONTHLY_CAPACITY_EMPTY_LABEL = "Sin cargar";

export type MonthlyCapacityValue = string | number | null | undefined;

// Empty and zero share the same state: the product does not enter the expense
// split. The form sends text while the user types; the list sends a number.
export function isMonthlyCapacityMissing(value: MonthlyCapacityValue): boolean {
  if (value === null || value === undefined) return true;

  if (typeof value === "number") return value === 0;

  const trimmed = value.trim();

  if (trimmed === "") return true;

  return Number(trimmed) === 0;
}

// The list never shows a bare 0: both "empty" and zero read as "Sin cargar".
export function formatMonthlyCapacity(
  value: number | null | undefined,
): string {
  return value === null || value === undefined || value === 0
    ? MONTHLY_CAPACITY_EMPTY_LABEL
    : String(value);
}
