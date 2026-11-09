// Confirmation message shown after a successful save. Kept as a helper so
// the wording lives in one place if it ever changes.
export function buildConfirmation(action: "create" | "edit"): string {
  return action === "create"
    ? "Insumo guardado en tu catálogo."
    : "Insumo actualizado.";
}
