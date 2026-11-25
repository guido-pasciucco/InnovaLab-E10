"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { useFieldArray, useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { savePresentation } from "@/app/(business)/products/[id]/presentations/actions";
import {
  createPresentationFormSchema,
  type PackagingOption,
  type PresentationFormValues,
  type PresentationItem,
} from "@/lib/schemas/presentations/presentations";
import { getSupplyUnitsForFamily } from "@/lib/schemas/supplies/units";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

type PresentationFormProps = {
  productId: string;
  presentation: PresentationItem | null;
  packaging: PackagingOption[];
  onCancel: () => void;
  onSaved: () => void;
};

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<PresentationFormValues>[] = [
  "name",
  "unitsPerPresentation",
  "monthlyCapacity",
  "packaging",
];

function emptyPackagingRow(): PresentationFormValues["packaging"][number] {
  return { supplyId: "", quantity: "", unit: "" };
}

function capacityDefault(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function toDefaultValues(presentation: PresentationItem | null): PresentationFormValues {
  if (!presentation) {
    return { name: "", unitsPerPresentation: "", monthlyCapacity: "", packaging: [] };
  }

  return {
    name: presentation.name,
    unitsPerPresentation: presentation.unitsPerPresentation,
    monthlyCapacity: capacityDefault(presentation.monthlyCapacity),
    packaging: presentation.packaging.map(({ supplyId, quantity, unit }) => ({
      supplyId,
      quantity,
      unit,
    })),
  };
}

export function PresentationForm({
  productId,
  presentation,
  packaging,
  onCancel,
  onSaved,
}: PresentationFormProps) {
  const [state, submitAction, isPending] = useActionState(savePresentation, undefined);

  const packagingById = useMemo(
    () => new Map(packaging.map((option) => [option.id, option])),
    [packaging],
  );
  const schema = useMemo(() => createPresentationFormSchema(packaging), [packaging]);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<PresentationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(presentation),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "packaging" });
  const lines = useWatch({ control, name: "packaging" });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!isPending && isSubmittingRef.current) isSubmittingRef.current = false;
  }, [isPending]);

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  const handleSubmitAction = (values: PresentationFormValues) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    dispatchInTransition(submitAction)({
      ...values,
      productId,
      ...(presentation ? { id: presentation.id } : {}),
    });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(handleSubmitAction)(event);
  };

  const packagingMessage =
    (errors.packaging as { message?: string } | undefined)?.message ??
    errors.packaging?.root?.message;

  return (
    <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-4">
      {state && !state.ok && !hasServerFieldErrors && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Nombre de la presentación"
          placeholder="Caja x6"
          disabled={isPending}
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="Unidades que contiene"
          placeholder="6"
          inputMode="numeric"
          autoComplete="off"
          disabled={isPending}
          error={errors.unitsPerPresentation?.message}
          {...register("unitsPerPresentation")}
        />
        <TextField
          label="Capacidad mensual"
          placeholder="50"
          inputMode="numeric"
          autoComplete="off"
          disabled={isPending}
          error={errors.monthlyCapacity?.message}
          {...register("monthlyCapacity")}
        />
      </div>
      <p className="text-sm text-fg-muted">
        Cuántas de estas presentaciones podés hacer por mes. Con eso se reparten los gastos y se arma el precio.
      </p>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-semibold text-fg">Packaging</legend>
        <p className="text-sm text-fg-muted">
          Elegí el packaging que usa esta presentación y cuánto lleva de cada uno.
        </p>

        {packaging.length === 0 && (
          <div className="rounded-[16px] bg-warning-subtle p-4 text-sm text-fg">
            <p>Todavía no cargaste packaging.</p>
            <Link
              href="/supplies"
              className="mt-1 inline-block font-semibold text-link underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Cargá tu packaging
            </Link>
          </div>
        )}

        {fields.map((field, index) => {
          const selected = packagingById.get(lines?.[index]?.supplyId ?? "");
          const unitOptions = selected?.family ? getSupplyUnitsForFamily(selected.family) : [];
          const supplyField = register(`packaging.${index}.supplyId`);

          return (
            <div
              key={field.id}
              className="rounded-[16px] border border-border-default bg-surface-tint p-3"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_110px_150px_auto] sm:items-start">
                <SelectField
                  label="Packaging"
                  disabled={isPending}
                  error={errors.packaging?.[index]?.supplyId?.message}
                  {...supplyField}
                  onChange={(event) => {
                    supplyField.onChange(event);
                    setValue(
                      `packaging.${index}.unit`,
                      packagingById.get(event.target.value)?.defaultUnit ?? "",
                      { shouldValidate: false },
                    );
                  }}
                >
                  <option value="">Elegí un packaging</option>
                  {packaging.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </SelectField>

                <TextField
                  label="Cantidad"
                  placeholder="1"
                  inputMode="decimal"
                  disabled={isPending}
                  error={errors.packaging?.[index]?.quantity?.message}
                  {...register(`packaging.${index}.quantity`)}
                />

                <SelectField
                  label="Unidad"
                  disabled={!selected || isPending}
                  error={errors.packaging?.[index]?.unit?.message}
                  {...register(`packaging.${index}.unit`)}
                >
                  <option value="">{selected ? "Elegí la unidad" : "Elegí un packaging"}</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </SelectField>

                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={isPending}
                  className="min-h-11 rounded-[10px] border border-border-control px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 sm:mt-7"
                >
                  Quitar
                </button>
              </div>
            </div>
          );
        })}

        {packagingMessage && (
          <p role="alert" className="text-sm text-danger">
            {packagingMessage}
          </p>
        )}

        <button
          type="button"
          onClick={() => append(emptyPackagingRow())}
          disabled={packaging.length === 0 || isPending}
          className="min-h-11 self-start rounded-[10px] border border-border-control bg-surface px-4 py-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Agregar packaging
        </button>
      </fieldset>

      <div className="flex gap-3">
        <PrimaryButton type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar"}
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
    </form>
  );
}
