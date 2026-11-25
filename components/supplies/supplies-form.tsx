"use client";import { Button } from "@/components/ui/button";


import { useActionState, useEffect, useRef, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Path } from "react-hook-form";

import { saveSupply } from "@/app/(business)/supplies/actions";
import {
  calculateMinimumUnitPrice,
  calculateMinimumUnits,
} from "@/lib/calc/supplyCost";
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
];

export function SuppliesForm({ kind, supply, onCancel, onSaved }: SuppliesFormProps) {
  const isEditing = supply !== null;
  const displayKind = supply?.kind ?? kind;
  const [state, submitAction, isPending] = useActionState(saveSupply, undefined);

  const initialPurchaseUnit = supply === null ? "" : canonicalSupplyUnit(supply.purchaseUnit);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
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
        }
      : {
          kind,
          name: "",
          purchasePrice: "",
          purchaseQuantity: "1",
          purchaseUnit: "",
        },
  });

  const purchasePrice = useWatch({ control, name: "purchasePrice" });
  const purchaseQuantity = useWatch({ control, name: "purchaseQuantity" });
  const purchaseUnit = useWatch({ control, name: "purchaseUnit" });

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

  // The schema normalizes a comma on submit. The preview reads the raw field,
  // so the same single-comma replacement happens here before the cost formulas.
  const previewQuantity = purchaseQuantity.trim().replace(",", ".");
  const totalUnits = calculateMinimumUnits(previewQuantity, purchaseUnit);
  const unitPrice = calculateMinimumUnitPrice(purchasePrice, previewQuantity, purchaseUnit);
  const unitLabel = getSupplyUnit(purchaseUnit)?.minimumUnit ?? "unidad mínima";
  const showPreview =
    purchasePrice.trim() !== "" &&
    totalUnits !== null &&
    unitPrice !== null &&
    purchaseUnit.trim() !== "";

  const unitOptions: { value: string; label: string }[] = SUPPLY_UNITS.map((unit) => ({
    value: unit.value,
    label: unit.label,
  }));

  // Keep an unknown legacy unit editable instead of silently changing the row.
  if (purchaseUnit.trim() !== "" && !getSupplyUnit(purchaseUnit)) {
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
              text="Ingresá el total comprado en la unidad elegida (kg, metros, ml, etc.). Si compraste 25 kg, cargá 25. Podés escribir decimales con coma."
            />
          }
          {...register("purchaseQuantity")}
        />
        <SelectField
          label="Unidad de medida"
          disabled={isPending}
          error={errors.purchaseUnit?.message}
          help={
            <HelpTooltip
              label="Unidad de medida"
              align="right"
              text="Elegí la unidad de medida de compra. El sistema calcula automáticamente el costo por unidad."
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
      </FormGrid>

      {showPreview && (
        <div className="rounded-[14px] border border-border-tonal bg-surface-tint p-3 text-sm text-fg-muted">
          <p>
            Total:{" "}
            <span className="font-semibold text-fg">
              {quantityFormat.format(Number(previewQuantity))} {purchaseUnit} ={" "}
              {quantityFormat.format(Number(totalUnits))} {unitLabel}
            </span>
          </p>
          <p className="mt-0.5">
            Costo por {unitLabel}:{" "}
            <span className="font-semibold text-fg">
              {unitPriceFormat.format(Number(unitPrice))}
            </span>
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <PrimaryButton type="submit" disabled={isPending}>
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

      {state?.ok && (
        <p role="status" className="text-sm text-brand-green-700">
          {buildConfirmation(isEditing ? "edit" : "create", displayKind)}
        </p>
      )}
    </form>
  );
}
