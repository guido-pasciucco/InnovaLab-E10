"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, type FormEvent } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
  type Path,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { saveProduct } from "@/app/products/actions";
import type {
  ProductFormValues,
  ProductItem,
  RecipeSupplyOption,
} from "@/lib/schemas/products/products";
import { createProductFormSchema } from "@/lib/schemas/products/products";
import {
  getSupplyUnit,
  getSupplyUnitsForFamily,
  isRecipeUnitAllowed,
} from "@/lib/schemas/supplies/units";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

type ProductFormProps = {
  product: ProductItem | null;
  supplies: RecipeSupplyOption[];
  onCancel: () => void;
  onSaved: (product: ProductItem) => void;
};

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<ProductFormValues>[] = ["name", "recipe"];

// Empty row used when the form opens or the user adds another ingredient.
function emptyRecipeRow(): ProductFormValues["recipe"][number] {
  return { supplyId: "", quantity: "", unit: "" };
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
      unit: item.unit,
    })),
  };
}

function recipeArrayMessage(errors: FieldErrors<ProductFormValues>): string | undefined {
  const recipe = errors.recipe as
    | { message?: string; root?: { message?: string } }
    | undefined;

  return recipe?.message ?? recipe?.root?.message;
}

// Catalog units of the selected supply's family, plus the stored value when it
// predates the catalog (legacy rows must stay visible and editable).
function recipeUnitOptions(
  supply: RecipeSupplyOption | undefined,
  currentUnit: string,
): { value: string; label: string }[] {
  if (!supply) return [];

  const options = supply.family
    ? getSupplyUnitsForFamily(supply.family).map((unit) => ({
        value: unit.value,
        label: unit.label,
      }))
    : supply.defaultUnit
      ? [{ value: supply.defaultUnit, label: `${supply.defaultUnit} (actual)` }]
      : [];

  if (
    currentUnit &&
    !options.some((option) => option.value === currentUnit) &&
    isRecipeUnitAllowed(supply, currentUnit)
  ) {
    options.push({ value: currentUnit, label: `${currentUnit} (actual)` });
  }

  return options;
}

export function ProductForm({
  product,
  supplies,
  onCancel,
  onSaved,
}: ProductFormProps) {
  const isEditing = product !== null;
  const hasSupplies = supplies.length > 0;
  const [state, submitAction, isPending] = useActionState(saveProduct, undefined);

  // The catalog snapshot travels with the schema: saving a recipe whose supply
  // was deleted (or turned into packaging) fails with a field error instead of
  // storing a dangling id. The unit selector also uses this snapshot.
  const suppliesById = useMemo(
    () => new Map(supplies.map((supply) => [supply.id, supply])),
    [supplies],
  );
  const schema = useMemo(() => createProductFormSchema(supplies), [supplies]);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(product),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "recipe",
  });

  const recipeValues = useWatch({ control, name: "recipe" });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!isPending && isSubmittingRef.current) {
      isSubmittingRef.current = false;
    }
  }, [isPending]);

  // Once the server confirms the save, hand the persisted product back to the
  // catalog so it can replace its local row without a full reload.
  useEffect(() => {
    if (state?.ok) onSaved(state.data);
  }, [state, onSaved]);

  const handleSubmitAction = (values: ProductFormValues) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    dispatchInTransition(submitAction)({
      ...values,
      ...(product ? { id: product.id } : {}),
    });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(handleSubmitAction)(event);
  };

  const arrayMessage = recipeArrayMessage(errors);

  return (
    <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-4">
      {state && !state.ok && !hasServerFieldErrors && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <TextField
        label="Nombre del producto"
        placeholder="Pan flauta"
        disabled={isPending}
        error={errors.name?.message}
        {...register("name")}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-semibold text-fg">Receta</legend>
        <p className="text-sm text-fg-muted">
          Elegí los insumos que ya cargaste y anotá la cantidad y la unidad de
          cada uno.
        </p>

        {!hasSupplies && (
          <div className="rounded-[16px] bg-warning-subtle p-4 text-sm text-fg">
            <p>Todavía no tenés insumos disponibles.</p>
            <p className="mt-1 text-fg-muted">
              El packaging no se usa como ingrediente de la receta.
            </p>
            <Link
              href="/insumos"
              className="mt-1 inline-block font-semibold text-link underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Cargá tu catálogo de insumos
            </Link>
          </div>
        )}

        {fields.map((field, index) => {
          const selectedSupply = suppliesById.get(
            recipeValues?.[index]?.supplyId ?? "",
          );
          const unitOptions = recipeUnitOptions(
            selectedSupply,
            recipeValues?.[index]?.unit ?? "",
          );
          const supplyField = register(`recipe.${index}.supplyId`);

          return (
            <div
              key={field.id}
              className="rounded-[16px] border border-border-default bg-surface-tint p-3"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_110px_150px_auto] sm:items-start">
                <SelectField
                  label="Insumo"
                  disabled={!hasSupplies || isPending}
                  error={errors.recipe?.[index]?.supplyId?.message}
                  {...supplyField}
                  onChange={(event) => {
                    supplyField.onChange(event);
                    const nextSupply = suppliesById.get(event.target.value);
                    setValue(
                      `recipe.${index}.unit`,
                      nextSupply?.defaultUnit ?? "",
                      { shouldValidate: false },
                    );
                  }}
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
                  disabled={!hasSupplies || isPending}
                  error={errors.recipe?.[index]?.quantity?.message}
                  {...register(`recipe.${index}.quantity`)}
                />

                <SelectField
                  label="Unidad"
                  disabled={!selectedSupply || isPending}
                  error={errors.recipe?.[index]?.unit?.message}
                  {...register(`recipe.${index}.unit`)}
                >
                  <option value="">
                    {selectedSupply ? "Elegí la unidad" : "Elegí un insumo"}
                  </option>
                  {unitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>

                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1 || isPending}
                  className="min-h-11 rounded-[10px] border border-border-control px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 sm:mt-7"
                >
                  Quitar
                </button>
              </div>
            </div>
          );
        })}

        {arrayMessage && (
          <p role="alert" className="text-sm text-danger">
            {arrayMessage}
          </p>
        )}

        <button
          type="button"
          onClick={() => append(emptyRecipeRow())}
          disabled={!hasSupplies || isPending}
          className="min-h-11 self-start rounded-[10px] border border-border-control bg-surface px-4 py-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Agregar insumo
        </button>
      </fieldset>

      <div className="flex gap-3">
        <PrimaryButton
          type="submit"
          disabled={!hasSupplies || isPending}
        >
          {isPending
            ? "Guardando…"
            : isEditing
              ? "Guardar cambios"
              : "Guardar producto"}
        </PrimaryButton>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="min-h-11 flex-1 rounded-[14px] border border-border-control bg-surface px-4 py-2 text-base font-semibold text-fg hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>

      <p className="text-xs text-fg-muted">
        La receta se guarda junto con el producto.
      </p>
    </form>
  );
}
