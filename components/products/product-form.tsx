"use client";

import Link from "next/link";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type {
  ProductFormValues,
  ProductItem,
  RecipeSupplyOption,
} from "@/lib/schemas/products/products";
import { productFormSchema } from "@/lib/schemas/products/products";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

type ProductFormProps = {
  product: ProductItem | null;
  supplies: RecipeSupplyOption[];
  onCancel: () => void;
  onSave: (product: ProductItem) => void;
};

// Empty row used when the form opens or the user adds another ingredient.
function emptyRecipeRow(): ProductFormValues["recipe"][number] {
  return { supplyId: "", quantity: "" };
}

function toDefaultValues(product: ProductItem | null): ProductFormValues {
  if (!product) {
    return { name: "", recipe: [emptyRecipeRow()] };
  }

  return {
    name: product.name,
    recipe: product.recipe.map((item) => ({
      supplyId: item.supplyId,
      quantity: item.quantity,
    })),
  };
}

function recipeArrayMessage(errors: FieldErrors<ProductFormValues>): string | undefined {
  const recipe = errors.recipe as
    | { message?: string; root?: { message?: string } }
    | undefined;

  return recipe?.message ?? recipe?.root?.message;
}

export function ProductForm({
  product,
  supplies,
  onCancel,
  onSave,
}: ProductFormProps) {
  const isEditing = product !== null;
  const hasSupplies = supplies.length > 0;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toDefaultValues(product),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "recipe",
  });

  const supplyNameById = new Map(supplies.map((supply) => [supply.id, supply.name]));
  const arrayMessage = recipeArrayMessage(errors);

  const onSubmit = (values: ProductFormValues) => {
    const recipe = values.recipe.map((item) => ({
      supplyId: item.supplyId,
      supplyName: supplyNameById.get(item.supplyId) ?? "",
      quantity: item.quantity.trim(),
    }));

    onSave({
      id: product?.id ?? crypto.randomUUID(),
      name: values.name.trim(),
      recipe,
    });
  };

  return (
    <section className="rounded-[24px] bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-fg">
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </h3>
          <p className="mt-1 text-sm text-fg-muted">
            Ponele un nombre y armá la receta con los insumos de tu catálogo.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-4 flex flex-col gap-4"
      >
        <TextField
          label="Nombre del producto"
          placeholder="Pan flauta"
          error={errors.name?.message}
          {...register("name")}
        />

        <fieldset className="flex flex-col gap-3">
          <legend className="text-base font-semibold text-fg">Receta</legend>
          <p className="text-sm text-fg-muted">
            Elegí los insumos que ya cargaste y anotá la cantidad de cada uno.
          </p>

          {!hasSupplies && (
            <div className="rounded-[16px] bg-warning-subtle p-4 text-sm text-fg">
              <p>Todavía no tenés insumos cargados.</p>
              <Link
                href="/supplies"
                className="mt-1 inline-block font-semibold text-link underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Cargá tu catálogo de insumos
              </Link>
            </div>
          )}

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-[16px] border border-border-default bg-surface-tint p-3"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-start">
                <SelectField
                  label="Insumo"
                  disabled={!hasSupplies}
                  error={errors.recipe?.[index]?.supplyId?.message}
                  {...register(`recipe.${index}.supplyId`)}
                >
                  <option value="">Elegí un insumo</option>
                  {supplies.map((supply) => (
                    <option key={supply.id} value={supply.id}>
                      {supply.name}
                    </option>
                  ))}
                </SelectField>

                <TextField
                  label="Cantidad"
                  placeholder="250"
                  inputMode="decimal"
                  disabled={!hasSupplies}
                  error={errors.recipe?.[index]?.quantity?.message}
                  {...register(`recipe.${index}.quantity`)}
                />

                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="min-h-11 rounded-[10px] border border-border-control px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 sm:mt-7"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}

          {arrayMessage && (
            <p role="alert" className="text-sm text-danger">
              {arrayMessage}
            </p>
          )}

          <button
            type="button"
            onClick={() => append(emptyRecipeRow())}
            disabled={!hasSupplies}
            className="min-h-11 self-start rounded-[10px] border border-border-control bg-surface px-4 py-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Agregar insumo
          </button>
        </fieldset>

        <div className="flex gap-3">
          <PrimaryButton
            type="submit"
            className="flex-1"
            disabled={!hasSupplies}
          >
            {isEditing ? "Guardar cambios" : "Guardar producto"}
          </PrimaryButton>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-[14px] border border-border-control bg-surface px-4 py-2 text-base font-semibold text-fg hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Cancelar
          </button>
        </div>

        <p className="text-xs text-fg-muted">
          Vista previa de la pantalla: el guardado definitivo se conecta con el
          backend de la issue #240.
        </p>
      </form>
    </section>
  );
}
