"use client";

import { Button } from "@/components/ui/button";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
  type Path,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { saveProduct } from "@/app/(business)/products/actions";
import type {
  ProductFormValues,
  ProductItem,
  RecipeSupplyOption,
} from "@/lib/schemas/products/products";
import { createProductFormSchema } from "@/lib/schemas/products/products";
import { getSupplyUnitsForFamily } from "@/lib/schemas/supplies/units";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import {
  isMonthlyCapacityMissing,
  MONTHLY_CAPACITY_LABEL,
  MONTHLY_CAPACITY_WARNING,
} from "@/components/products/monthly-capacity";
import { FormGrid } from "@/components/ui/form-grid";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { emptyRecipeRow, toProductFormDefaults } from "./product-form-defaults";
import { RecipeYieldField } from "./recipe-yield-field";
import { VariableCostResult } from "./variable-cost-result";

type ProductFormProps = {
  hasPresentations?: boolean;
  product: ProductItem | null;
  supplies: RecipeSupplyOption[];
  onCancel: () => void;
  onSaved: (product: ProductItem) => void;
};

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<ProductFormValues>[] = [
  "name",
  "monthlyCapacity",
  "yieldQuantity",
  "recipe",
];

function recipeArrayMessage(errors: FieldErrors<ProductFormValues>): string | undefined {
  const recipe = errors.recipe as
    | { message?: string; root?: { message?: string } }
    | undefined;

  return recipe?.message ?? recipe?.root?.message;
}

// Catalog units of the selected supply's family.
function recipeUnitOptions(
  supply: RecipeSupplyOption | undefined,
): { value: string; label: string }[] {
  if (!supply?.family) return [];

  return getSupplyUnitsForFamily(supply.family).map((unit) => ({
    value: unit.value,
    label: unit.label,
  }));
}

// #288: the mockup shows Datos / Receta / Costeo as separate tabs. Tabs would be
// a new interaction (out of scope), so the same three moments are expressed as
// consecutive, clearly titled sections in one scrollable form. This keeps the
// existing submit flow and keyboard order untouched.
function FormSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <header className="space-y-0.5">
        <p className="text-xs font-bold tracking-[0.12em] text-brand-green-700 uppercase">
          {eyebrow}
        </p>
        <h3 id={id} className="text-base font-semibold text-fg">
          {title}
        </h3>
        {description && <p className="text-sm text-fg-muted">{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function ProductForm({
  product,
  supplies,
  hasPresentations = false,
  onCancel,
  onSaved,
}: ProductFormProps) {
  const hasSupplies = supplies.length > 0;
  const [state, submitAction, isPending] = useActionState(saveProduct, undefined);
  const sectionId = useId();

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
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toProductFormDefaults(product),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "recipe",
  });

  const productName = useWatch({ control, name: "name" });
  const yieldQuantity = useWatch({ control, name: "yieldQuantity" });

  const recipeValues = useWatch({ control, name: "recipe" });
  const monthlyCapacity = useWatch({ control, name: "monthlyCapacity" });
  const showMonthlyCapacityWarning =
    isMonthlyCapacityMissing(monthlyCapacity);

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

    const savedCapacity =
      product?.monthlyCapacity === null || product?.monthlyCapacity === undefined
        ? ""
        : String(product.monthlyCapacity);

    dispatchInTransition(submitAction)({
      ...values,
      // The product capacity is unused while presentations exist, and the
      // field is not on the form. Keep the stored value instead of clearing it.
      ...(hasPresentations ? { monthlyCapacity: savedCapacity } : {}),
      ...(product ? { id: product.id } : {}),
    });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(handleSubmitAction)(event);
  };

  const arrayMessage = recipeArrayMessage(errors);

  return (
    <form
      onSubmit={handleFormSubmit}
      noValidate
      aria-busy={isPending}
      className="flex flex-col gap-5"
    >
      {state && !state.ok && !hasServerFieldErrors && (
        <p
          role="alert"
          className="rounded-[14px] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger"
        >
          {state.message}
        </p>
      )}

      <FormSection
        id={`${sectionId}-data`}
        eyebrow="Datos del producto"
        title="¿Qué estás calculando?"
        description={
          hasPresentations
            ? "La capacidad de este producto se carga en cada presentación."
            : "Ponéle nombre y cargá cuántas unidades pensás fabricar este mes."
        }
      >
        {/* #288 QA: FormGrid already ships grid-cols-2, so overriding it with
            grid-cols-1 lost on mobile. stackOnMobile owns the breakpoint.
            The min-height reserves two label lines on desktop so both inputs
            start at the same height. */}
        <FormGrid stackOnMobile className="sm:[&_label]:min-h-12">
          <TextField
            label="Nombre del producto"
            placeholder="Pan flauta"
            disabled={isPending}
            error={errors.name?.message}
            {...register("name")}
          />

          {hasPresentations && product ? (
            <p className="text-sm text-fg">
              La capacidad se carga en cada presentación.{" "}
              <Link
                href={`/products/${product.id}/presentations`}
                className="font-semibold text-link underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Ver presentaciones
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <TextField
                label={MONTHLY_CAPACITY_LABEL}
                placeholder="200"
                inputMode="numeric"
                autoComplete="off"
                disabled={isPending}
                error={errors.monthlyCapacity?.message}
                {...register("monthlyCapacity")}
              />
              {showMonthlyCapacityWarning && !errors.monthlyCapacity && (
                <p role="status" className="text-sm text-fg-muted">
                  {MONTHLY_CAPACITY_WARNING}
                </p>
              )}
            </div>
          )}
        </FormGrid>
      </FormSection>

      <FormSection
        id={`${sectionId}-recipe`}
        eyebrow="Receta"
        title="Armá la receta"
        description="Elegí los insumos que ya cargaste y anotá la cantidad y la unidad de cada uno."
      >
        {!hasSupplies && (
          <div className="rounded-[16px] border border-warning/30 bg-warning-subtle p-4 text-sm text-fg">
            <p>Todavía no tenés insumos disponibles.</p>
            <p className="mt-1 text-fg-muted">
              El packaging no se usa como ingrediente de la receta.
            </p>
            <Link
              href="/supplies"
              className="mt-1 inline-block font-semibold text-link underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Cargá tu catálogo de insumos
            </Link>
          </div>
        )}

        {/* One table-like block: column headers on desktop, stacked rows on
            mobile. Inputs and their labels stay identical for a11y and e2e. */}
        <div className="overflow-hidden rounded-[16px] border border-border-default">
          <div className="hidden grid-cols-[1fr_110px_150px_auto] gap-3 border-b border-border-default bg-surface-tint px-3 py-2 sm:grid">
            <span className="text-xs font-bold tracking-wide text-fg-muted uppercase">Insumo</span>
            <span className="text-xs font-bold tracking-wide text-fg-muted uppercase">Cantidad</span>
            <span className="text-xs font-bold tracking-wide text-fg-muted uppercase">Unidad</span>
            <span className="sr-only">Acciones</span>
          </div>

          <div className="divide-y divide-border-default">
            {fields.map((field, index) => {
              const selectedSupply = suppliesById.get(
                recipeValues?.[index]?.supplyId ?? "",
              );
              // main simplified the unit catalog: options come only from the
              // selected supply's family (#288 visual work keeps this rule).
              const unitOptions = recipeUnitOptions(selectedSupply);
              const supplyField = register(`recipe.${index}.supplyId`);

              return (
                <div
                  key={field.id}
                  className="grid gap-3 p-3 sm:grid-cols-[1fr_110px_150px_auto] sm:items-start"
                >
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

                  <Button variant="danger" size="md"
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1 || isPending}
                    className="min-h-11! rounded-[10px]! border! border-border-control! bg-surface! px-3! py-2! text-sm! font-semibold! text-danger! hover:bg-danger-subtle! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:cursor-not-allowed! disabled:opacity-50! sm:mt-7!"
                  >
                    Quitar
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {arrayMessage && (
          <p role="alert" className="text-sm text-danger">
            {arrayMessage}
          </p>
        )}

        <Button variant="outline" size="md"
          type="button"
          onClick={() => append(emptyRecipeRow())}
          disabled={!hasSupplies || isPending}
          className="inline-flex! min-h-11! items-center! justify-center! rounded-[10px]! border! border-dashed! border-border-control! bg-surface! px-4! py-2! text-sm! font-semibold! text-brand-green-700! hover:bg-brand-green-50! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:cursor-not-allowed! disabled:opacity-50!"
        >
          + Agregar insumo
        </Button>
      </FormSection>

      <RecipeYieldField
        productName={productName}
        value={yieldQuantity}
        onChange={(value) =>
          setValue("yieldQuantity", value, {
            shouldValidate: true,
            // QA-297-01: setValue does not mark the form dirty by default, so
            // changing only the yield left the saved cost labelled as current.
            shouldDirty: true,
          })
        }
        error={errors.yieldQuantity?.message}
        disabled={isPending}
      />

      <FormSection
        id={`${sectionId}-cost`}
        eyebrow="Costeo"
        title="Costo variable"
        description="Se calcula con los ingredientes de la receta y el rendimiento; no se edita acá."
      >
        <VariableCostResult
          costs={product?.variableCosts ?? null}
          unavailableCode={product?.variableCostsUnavailableCode ?? null}
          pending={!product}
          // Only the saved calculation is available on the client; when the
          // form is dirty we label it as the previous result instead of
          // implying it already reflects the edits (#288 QA).
          stale={Boolean(product && isDirty && product.variableCosts)}
        />
      </FormSection>

      <div className="flex gap-3 border-t border-border-default pt-4">
        <PrimaryButton
          type="submit"
          disabled={!hasSupplies || isPending}
        >
          {isPending ? "Guardando…" : "Guardar"}
        </PrimaryButton>
        <Button variant="ghost" size="md"
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="min-h-11! flex-1! rounded-[14px]! border! border-border-control! bg-surface! px-4! py-2! text-base! font-semibold! text-fg! hover:bg-surface-tint! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:cursor-not-allowed! disabled:opacity-50!"
        >
          Cancelar
        </Button>
      </div>

      <p className="-mt-2 text-xs text-fg-muted">
        La receta se guarda junto con el producto.
      </p>
    </form>
  );
}
