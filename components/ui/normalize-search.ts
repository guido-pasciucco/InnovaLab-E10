// Accent-insensitive, case-insensitive text used by the catalog search boxes so
// "harina" finds "Harina" and "azucar" finds "Azúcar". Shared by the Insumos and
// Productos catalogs so both filter the same way.
export function normalizeForSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
