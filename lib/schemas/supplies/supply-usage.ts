// Where a supply is still needed, carried in SUPPLY_IN_USE `details` so the
// catalog can explain the impact instead of showing a generic refusal.
// Pure and client-safe: no db or server-only imports here.

export type RecipeSupplyUsage = {
  kind: "recipe";
  productId: string;
  productName: string;
  ingredientCount: number;
  isActive: boolean;
};

export type PresentationSupplyUsage = {
  kind: "presentation";
  productId: string;
  productName: string;
  presentationId: string;
  presentationName: string;
  isActive: boolean;
};

export type SupplyUsage = RecipeSupplyUsage | PresentationSupplyUsage;

export type SupplyUsageDetails = { usages: SupplyUsage[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecipeUsage(value: unknown): value is RecipeSupplyUsage {
  return (
    isRecord(value) &&
    value.kind === "recipe" &&
    isNonEmptyString(value.productId) &&
    isNonEmptyString(value.productName) &&
    typeof value.ingredientCount === "number" &&
    Number.isInteger(value.ingredientCount) &&
    value.ingredientCount > 0 &&
    typeof value.isActive === "boolean"
  );
}

function isPresentationUsage(value: unknown): value is PresentationSupplyUsage {
  return (
    isRecord(value) &&
    value.kind === "presentation" &&
    isNonEmptyString(value.productId) &&
    isNonEmptyString(value.productName) &&
    isNonEmptyString(value.presentationId) &&
    isNonEmptyString(value.presentationName) &&
    typeof value.isActive === "boolean"
  );
}

export function isSupplyUsageDetails(value: unknown): value is SupplyUsageDetails {
  return (
    isRecord(value) &&
    Array.isArray(value.usages) &&
    value.usages.every((usage) => isRecipeUsage(usage) || isPresentationUsage(usage))
  );
}
