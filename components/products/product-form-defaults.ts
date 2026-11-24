import type { ProductFormValues, ProductItem } from "@/lib/schemas/products/products";

// D1: a new recipe yields one unit unless the user says otherwise.
export const DEFAULT_RECIPE_YIELD = "1";

// Empty row used when the form opens or the user adds another ingredient.
export function emptyRecipeRow(): ProductFormValues["recipe"][number] {
  return { supplyId: "", quantity: "", unit: "" };
}

// Initial form values: defaults for a new product, saved values when editing.
// A saved product without yield stays empty so the user fills it on purpose.
export function toProductFormDefaults(product: ProductItem | null): ProductFormValues {
  const monthlyCapacity =
    product?.monthlyCapacity === null || product?.monthlyCapacity === undefined
      ? ""
      : String(product.monthlyCapacity);

  if (!product) {
    return {
      name: "",
      monthlyCapacity,
      yieldQuantity: DEFAULT_RECIPE_YIELD,
      recipe: [emptyRecipeRow()],
    };
  }

  return {
    name: product.name,
    monthlyCapacity,
    yieldQuantity: product.yieldQuantity ?? "",
    recipe: product.recipe.map((item) => ({
      supplyId: item.supplyId,
      quantity: item.quantity,
      unit: item.unit,
    })),
  };
}
