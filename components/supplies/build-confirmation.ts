import type { SupplyKind } from "@/lib/schemas/supplies/fields";

// Confirmation message shown after a successful save. Kept as a helper so
// the wording lives in one place if it ever changes.
export function buildConfirmation(
  action: "create" | "edit",
  kind: SupplyKind,
): string {
  const noun = kind === "packaging" ? "Packaging" : "Insumo";

  return action === "create"
    ? `${noun} guardado en tu catálogo.`
    : `${noun} actualizado.`;
}
