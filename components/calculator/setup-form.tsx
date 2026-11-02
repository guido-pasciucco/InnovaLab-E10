"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Path } from "react-hook-form";

import { saveCalculatorSetup } from "@/app/(calculator)/paso-1/actions";
import {
  calculatorSetupSchema,
  type CalculatorSetup,
} from "@/lib/schemas/calculator-setup/calculator-setup";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { StepHeader } from "@/components/calculator/wizard/step-header";
import { LiveCostCard } from "@/components/calculator/live-cost-card";
import { toLiveCostCardValues } from "@/components/calculator/live-cost-card-values";
import type { CalculatorCostSummary } from "@/lib/types/calculator";
import { FormGrid } from "@/components/ui/form-grid";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

type SetupFormProps = {
  defaultValues: CalculatorSetup;
  // Persisted totals for the live card; null when they could not be read.
  costSummary: CalculatorCostSummary | null;
};

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<CalculatorSetup>[] = [
  "name",
  "unit",
  "volume",
];
// Saving the setup unlocks and opens step 2.
const NEXT_STEP_HREF = "/paso-2";

// Visual only: the sector chips and "Tipo" are not part of the saved setup.
const SECTORS = [
  "Velas y cosmética",
  "Gastronomía",
  "Diseño y servicios",
  "Indumentaria",
] as const;

// Moneda and Período are fixed by the schema; their selects are read-only.
const noop = () => {};

export function SetupForm({ defaultValues, costSummary }: SetupFormProps) {
  const router = useRouter();
  const [state, submitAction, isPending] = useActionState(
    saveCalculatorSetup,
    undefined,
  );

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CalculatorSetup>({
    resolver: zodResolver(calculatorSetupSchema),
    defaultValues,
  });

  // The live card mirrors the volume being typed; an empty or invalid value
  // (NaN from valueAsNumber) shows "—" instead of a made-up number.
  const watchedVolume = useWatch({ control, name: "volume" });
  const liveVolume =
    Number.isFinite(watchedVolume) && watchedVolume > 0
      ? watchedVolume
      : undefined;

  const [selectedSector, setSelectedSector] = useState<string>(SECTORS[0]);
  const [kind, setKind] = useState("Producto");

  const hasServerFieldErrors = useServerFieldErrors(
    state,
    setError,
    SERVER_FIELDS,
  );

  const isSubmittingRef = useRef(false);

  // Libera el bloqueo de doble envío cuando la acción termina (éxito o fallo).
  useEffect(() => {
    if (!isPending && isSubmittingRef.current) {
      isSubmittingRef.current = false;
    }
  }, [isPending]);

  // "Siguiente": once the server confirms the save, move on to the next step.
  // A failed save keeps the user here with the error shown below.
  useEffect(() => {
    if (state?.ok) router.push(NEXT_STEP_HREF);
  }, [state, router]);

  const handleSubmitAction = (data: CalculatorSetup) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    dispatchInTransition(submitAction)(data);
  };

  // The ref is read inside the submit event, not during render. Building the
  // handler here keeps react-hooks/refs from treating it as a render-time read.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(handleSubmitAction)(event);
  };

  return (
    <>
      <section className="rounded-[32px] bg-white/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
        <StepHeader
          currentStep={1}
          title="Configuración"
          description="Contanos qué vendés para empezar el cálculo."
        />

        <form
          onSubmit={handleFormSubmit}
          noValidate
          className="mt-4 flex flex-col gap-3"
        >
          {state && !state.ok && !hasServerFieldErrors && (
            <p role="alert" className="text-sm text-red-600">
              {state.message}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <p
              id="sector-label"
              className="text-base font-semibold text-gray-900"
            >
              Empezá con un ejemplo por rubro
            </p>
            <div
              role="group"
              aria-labelledby="sector-label"
              className="flex flex-wrap gap-2"
            >
              {SECTORS.map((sector) => (
                <button
                  key={sector}
                  type="button"
                  aria-pressed={sector === selectedSector}
                  onClick={() => setSelectedSector(sector)}
                  className="min-h-9 rounded-full border-2 border-gray-400 bg-white px-4 text-sm font-semibold text-gray-900 aria-pressed:border-[#3ad85c] aria-pressed:bg-[#d9f7e3] aria-pressed:text-[#136831] aria-pressed:ring-2 aria-pressed:ring-[#3ad85c]/40"
                >
                  {sector}
                </button>
              ))}
            </div>
          </div>

          <TextField
            label="Producto o servicio"
            placeholder="Vela de soja 200 g"
            disabled={isPending}
            error={errors.name?.message}
            {...register("name")}
          />

          <SelectField
            label="Tipo"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            disabled={isPending}
            className="appearance-none"
          >
            <option value="Producto">Producto</option>
            <option value="Servicio">Servicio</option>
          </SelectField>

          <FormGrid>
            <SelectField
              label="Moneda"
              value="ARS"
              disabled
              onChange={noop}
              className="appearance-none disabled:bg-white! disabled:text-gray-900!"
            >
              <option value="ARS">ARS</option>
            </SelectField>
            <SelectField
              label="Período"
              value="Mensual"
              disabled
              onChange={noop}
              className="appearance-none disabled:bg-white! disabled:text-gray-900!"
            >
              <option value="Mensual">Mensual</option>
            </SelectField>
            <TextField
              label="Unidad de venta"
              placeholder="Unidad"
              disabled={isPending}
              error={errors.unit?.message}
              {...register("unit")}
            />
            <TextField
              label="Volumen estimado"
              type="number"
              disabled={isPending}
              error={errors.volume?.message}
              {...register("volume", { valueAsNumber: true })}
            />
          </FormGrid>

          <PrimaryButton type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Siguiente"}
          </PrimaryButton>
        </form>
      </section>

      <LiveCostCard {...toLiveCostCardValues(costSummary, liveVolume)} />
    </>
  );
}
