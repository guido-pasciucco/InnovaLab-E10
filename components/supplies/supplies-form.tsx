"use client";

import { useActionState, useEffect, useRef, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Path } from "react-hook-form";

import { saveSupply } from "@/app/supplies/actions";
import { supplySchema, type Supply, type SupplyItem } from "@/lib/schemas/supplies/supplies";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { buildConfirmation } from "./build-confirmation";

type SuppliesFormProps = {
  supply: SupplyItem | null;
  onCancel: () => void;
  onSaved: () => void;
};

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<Supply>[] = ["name", "purchasePrice"];

export function SuppliesForm({ supply, onCancel, onSaved }: SuppliesFormProps) {
  const isEditing = supply !== null;
  const [state, submitAction, isPending] = useActionState(saveSupply, undefined);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Supply>({
    resolver: zodResolver(supplySchema),
    defaultValues: isEditing
      ? { name: supply.name, purchasePrice: supply.purchasePrice }
      : { name: "", purchasePrice: "" },
  });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);

  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!isPending && isSubmittingRef.current) {
      isSubmittingRef.current = false;
    }
  }, [isPending]);

  // Once the server confirms the save, close the form.
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

  return (
    <section className="rounded-[24px] bg-surface p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-fg">
        {isEditing ? "Editar insumo" : "Nuevo insumo"}
      </h3>

      <form
        onSubmit={handleFormSubmit}
        noValidate
        className="mt-4 flex flex-col gap-3"
      >
        {state && !state.ok && !hasServerFieldErrors && (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        )}

        <TextField
          label="Nombre del insumo"
          placeholder="Harina 000"
          disabled={isPending}
          error={errors.name?.message}
          {...register("name")}
        />

        <TextField
          label="Precio de compra"
          placeholder="18750.00"
          inputMode="decimal"
          disabled={isPending}
          error={errors.purchasePrice?.message}
          {...register("purchasePrice")}
        />

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

      {state?.ok && (
        <p role="status" className="mt-3 text-sm text-brand-green-700">
          {buildConfirmation(isEditing ? "edit" : "create")}
        </p>
      )}
    </section>
  );
}
