"use client";

import { useActionState, useEffect, useRef, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Path } from "react-hook-form";

import { saveSupply } from "@/app/insumos/actions";
import {
  calculateMinimumUnitPrice,
  calculateMinimumUnits,
} from "@/lib/calc/supplyCost";
import { suggestConversionFactor } from "@/lib/calc/suggestConversionFactor";
import {
  supplySchema,
  type Supply,
  type SupplyItem,
} from "@/lib/schemas/supplies/supplies";
import type { SupplyKind } from "@/lib/schemas/supplies/fields";
import { capitalizeFirstWord } from "@/lib/schemas/supplies/input-format";
import {
  SUPPLY_UNITS,
  canonicalSupplyUnit,
  getSupplyUnit,
} from "@/lib/schemas/supplies/units";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { FormGrid } from "@/components/ui/form-grid";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { buildConfirmation } from "./build-confirmation";
import { MoneyField } from "./money-field";
import { quantityFormat, trimDecimalZeros, unitPriceFormat } from "./format";

type SuppliesFormProps = {
  // Kind chosen by the active catalog tab (create) or by the edited item.
  kind: SupplyKind;
  supply: SupplyItem | null;
  onCancel: () => void;
  onSaved: () => void;
};

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<Supply>[] = [
  "kind",
  "name",
  "purchasePrice",
  "purchaseQuantity",
  "purchaseUnit",
  "minimumUnit",
  "conversionFactor",
];

export function SuppliesForm({ kind, supply, onCancel, onSaved }: SuppliesFormProps) {
  const isEditing = supply !== null;
  const displayKind = supply?.kind ?? kind;
  const [state, submitAction, isPending] = useActionState(saveSupply, undefined);

  const initialPurchaseUnit =
    supply === null
      ? ""
      : displayKind === "supply"
        ? canonicalSupplyUnit(supply.purchaseUnit)
        : supply.purchaseUnit;

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<Supply>({
    resolver: zodResolver(supplySchema),
    defaultValues: supply
      ? {
          kind: supply.kind,
          name: supply.name,
          purchasePrice: supply.purchasePrice,
          purchaseQuantity: trimDecimalZeros(supply.purchaseQuantity),
          purchaseUnit: initialPurchaseUnit,
          minimumUnit: supply.minimumUnit,
          conversionFactor: trimDecimalZeros(supply.conversionFactor),
        }
      : {
          kind,
          name: "",
          purchasePrice: "",
          purchaseQuantity: "1",
          purchaseUnit: "",
          minimumUnit: displayKind === "supply" ? "unidad" : "",
          conversionFactor: displayKind === "supply" ? "1" : "",
        },
  });

  const purchasePrice = useWatch({ control, name: "purchasePrice" });
  const purchaseQuantity = useWatch({ control, name: "purchaseQuantity" });
  const purchaseUnit = useWatch({ control, name: "purchaseUnit" });
  const minimumUnit = useWatch({ control, name: "minimumUnit" });
  const conversionFactor = useWatch({ control, name: "conversionFactor" });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);

  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!isPending && isSubmittingRef.current) {
      isSubmittingRef.current = false;
    }
  }, [isPending]);

  // Once the server confirms the save, close the modal.
  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  // Packaging keeps the old behaviour: suggest the equivalence for common
  // pairs (kg→g, L→ml, docena→unidad) while respecting a value the user typed.
  const lastSuggestion = useRef<string | null>(supply?.conversionFactor ?? null);

  useEffect(() => {
    if (displayKind !== "packaging") return;

    const suggested = suggestConversionFactor(purchaseUnit, minimumUnit);
    if (suggested === null) return;

    const current = getValues("conversionFactor");
    if (current === "" || current === lastSuggestion.current) {
      setValue("conversionFactor", suggested);
    }
    lastSuggestion.current = suggested;
  }, [displayKind, purchaseUnit, minimumUnit, getValues, setValue]);

  // Supplies derive both technical columns from the selected catalog unit.
  // The values are still submitted because the server contract keeps them, but
  // the user never edits them.
  useEffect(() => {
    if (displayKind !== "supply") return;

    const unit = getSupplyUnit(purchaseUnit);
    if (!unit) return;

    setValue("minimumUnit", unit.minimumUnit, { shouldValidate: true });
    setValue("conversionFactor", unit.factor, { shouldValidate: true });
  }, [displayKind, purchaseUnit, setValue]);

  const handleSubmitAction = (data: Supply) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const payload = isEditing ? { id: supply.id, ...data } : data;
    dispatchInTransition(submitAction)(payload);
  };

  // The ref is read inside the submit event, not during render.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(handleSubmitAction)(event);
  };

  const nameField = register("name");

  const totalUnits = calculateMinimumUnits(purchaseQuantity, conversionFactor);
  const unitPrice = calculateMinimumUnitPrice(
    purchasePrice,
    purchaseQuantity,
    conversionFactor,
  );
  const unitLabel = minimumUnit.trim() || "unidad mínima";
  const showPreview =
    purchasePrice.trim() !== "" &&
    totalUnits !== null &&
    unitPrice !== null &&
    (displayKind !== "supply" || purchaseUnit.trim() !== "");

  const unitOptions: { value: string; label: string }[] = SUPPLY_UNITS.map((unit) => ({
    value: unit.value,
    label: unit.label,
  }));

  // Keep an unknown legacy unit editable instead of silently changing the row.
  if (displayKind === "supply" && purchaseUnit.trim() !== "" && !getSupplyUnit(purchaseUnit)) {
    unitOptions.unshift({ value: purchaseUnit, label: `${purchaseUnit} (actual)` });
  }

  return (
    <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-3">
      <input type="hidden" {...register("kind")} />

      {state && !state.ok && !hasServerFieldErrors && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <TextField
        label={displayKind === "packaging" ? "Nombre del packaging" : "Nombre del insumo"}
        placeholder={displayKind === "packaging" ? "Bolsa kraft 1 kg" : "Harina 000"}
        disabled={isPending}
        error={errors.name?.message}
        {...nameField}
        onBlur={(event) => {
          nameField.onBlur(event);
          const capitalized = capitalizeFirstWord(event.currentTarget.value);
          if (capitalized !== event.currentTarget.value) {
            setValue("name", capitalized, { shouldValidate: true });
          }
        }}
      />

      <MoneyField
        control={control}
        disabled={isPending}
        error={errors.purchasePrice?.message}
        help={
          <HelpTooltip
            label="Precio de compra"
            text="Ingresá el precio total pagado por la cantidad comprada. Podés escribir centavos con coma."
          />
        }
      />

      <FormGrid className="gap-3">
        <TextField
          label="Cantidad comprada"
          placeholder="25"
          inputMode="decimal"
          disabled={isPending}
          error={errors.purchaseQuantity?.message}
          help={
            <HelpTooltip
              label="Cantidad comprada"
              text="Ingresá el total comprado en la unidad elegida (kg, metros, ml, etc.). Si compraste 25 kg, cargá 25."
            />
          }
          {...register("purchaseQuantity")}
        />
        {displayKind === "supply" ? (
          <SelectField
            label="Unidad de medida"
            disabled={isPending}
            error={errors.purchaseUnit?.message}
            help={
              <HelpTooltip
                label="Unidad de medida"
                align="right"
                text="Elegí la unidad de medida del insumo. El sistema calcula automáticamente el costo por unidad."
              />
            }
            {...register("purchaseUnit")}
          >
            <option value="">Elegí una unidad</option>
            {unitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        ) : (
          <TextField
            label="Unidad de compra"
            placeholder="kg"
            disabled={isPending}
            error={errors.purchaseUnit?.message}
            {...register("purchaseUnit")}
          />
        )}
      </FormGrid>

      {displayKind === "supply" ? (
        <>
          <input type="hidden" {...register("minimumUnit")} />
          <input type="hidden" {...register("conversionFactor")} />
        </>
      ) : (
        <>
          <FormGrid className="gap-3">
            <TextField
              label="Unidad mínima"
              placeholder="g"
              disabled={isPending}
              error={errors.minimumUnit?.message}
              {...register("minimumUnit")}
            />
            <TextField
              label="Equivalencia"
              placeholder="1000"
              inputMode="decimal"
              disabled={isPending}
              error={errors.conversionFactor?.message}
              {...register("conversionFactor")}
            />
          </FormGrid>

          <p className="text-xs text-fg-muted">
            Equivalencia: cuántas unidades mínimas trae 1 unidad de compra (1 kg = 1000 g).
          </p>
        </>
      )}

      {showPreview && (
        <div className="rounded-[14px] border border-border-tonal bg-surface-tint p-3 text-sm text-fg-muted">
          {displayKind === "supply" ? (
            <>
              <p>
                Total:{" "}
                <span className="font-semibold text-fg">
                  {quantityFormat.format(Number(purchaseQuantity))} {purchaseUnit} ={" "}
                  {quantityFormat.format(Number(totalUnits))} {unitLabel}
                </span>
              </p>
              <p className="mt-0.5">
                Costo por {unitLabel}:{" "}
                <span className="font-semibold text-fg">
                  {unitPriceFormat.format(Number(unitPrice))}
                </span>
              </p>
            </>
          ) : (
            <>
              <p>
                Total:{" "}
                <span className="font-semibold text-fg">
                  {quantityFormat.format(Number(totalUnits))} {unitLabel}
                </span>
              </p>
              <p className="mt-0.5">
                Costo por {unitLabel}:{" "}
                <span className="font-semibold text-fg">
                  {unitPriceFormat.format(Number(unitPrice))}
                </span>
              </p>
            </>
          )}
        </div>
      )}

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

      {state?.ok && (
        <p role="status" className="text-sm text-brand-green-700">
          {buildConfirmation(isEditing ? "edit" : "create", displayKind)}
        </p>
      )}
    </form>
  );
}
