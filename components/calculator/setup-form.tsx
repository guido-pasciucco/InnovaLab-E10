"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Path } from "react-hook-form";

import { saveCalculatorSetup } from "@/app/(calculator)/paso-1/actions";
import {
  calculatorSetupSchema,
  type CalculatorSetup,
} from "@/lib/schemas/calculator-setup/calculator-setup";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { buildConfirmation } from "@/components/calculator/build-confirmation";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { LiveCostCard } from "@/components/calculator/live-cost-card";
import { FormGrid } from "@/components/ui/form-grid";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

type SetupFormProps = {
  defaultValues: CalculatorSetup;
};

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<CalculatorSetup>[] = [
  "name",
  "unit",
  "volume",
];
const SETUP_FIELDS = ["name", "unit", "volume", "currency", "period"] as const;

// Visual only: the sector chips and "Tipo" are not part of the saved setup.
const SECTORS = [
  "Velas y cosmética",
  "Gastronomía",
  "Diseño y servicios",
  "Indumentaria",
] as const;

// Moneda and Período are fixed by the schema; their selects are read-only.
const noop = () => {};

export function SetupForm({ defaultValues }: SetupFormProps) {
  const [state, submitAction, isPending] = useActionState(
    saveCalculatorSetup,
    undefined,
  );

  const {
    register,
    handleSubmit,
    setError,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<CalculatorSetup>({
    resolver: zodResolver(calculatorSetupSchema),
    defaultValues,
  });

  const [selectedSector, setSelectedSector] = useState<string>(SECTORS[0]);
  const [kind, setKind] = useState("Producto");

  const hasServerFieldErrors = useServerFieldErrors(
    state,
    setError,
    SERVER_FIELDS,
  );

  const hasSuccess = state?.ok && state.data;

  const isSubmittingRef = useRef(false);
  const lastProcessedStateRef = useRef<typeof state | null>(null);
  const submittedValuesRef = useRef<CalculatorSetup | null>(null);

  // Libera el bloqueo de doble envío cuando la acción termina (éxito o fallo).
  useEffect(() => {
    if (!isPending && isSubmittingRef.current) {
      isSubmittingRef.current = false;
    }
  }, [isPending]);

  // Sincroniza el formulario con los datos confirmados por el servidor
  // después de un guardado exitoso, sin sobrescribir ediciones pendientes.
  useEffect(() => {
    if (!state?.ok || !state.data) return;
    if (lastProcessedStateRef.current === state) return;
    lastProcessedStateRef.current = state;
    const current = getValues();
    const submitted = submittedValuesRef.current;
    const hasLaterEdits =
      submitted !== null &&
      SETUP_FIELDS.some((field) => current[field] !== submitted[field]);
    // El resultado confirmado pasa a ser el nuevo baseline. Si hubo cambios
    // posteriores al envío, RHF los conserva y recalcula isDirty contra él.
    reset(state.data, { keepValues: hasLaterEdits });
  }, [state, reset, getValues]);

  const handleSubmitAction = (data: CalculatorSetup) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    submittedValuesRef.current = getValues();
    dispatchInTransition(submitAction)(data);
  };

  // The ref is read inside the submit event, not during render. Building the
  // handler here keeps react-hooks/refs from treating it as a render-time read.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(handleSubmitAction)(event);
  };

  return (
    <>
      <section className="rounded-[32px] bg-white/80 p-6 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-8">
        <span className="inline-block rounded-full border border-[#86e0a3] bg-[#d9f7e3] px-4 py-1 text-sm font-semibold uppercase text-[#136831]">
          Paso 1 de 7
        </span>
        <h1 className="mt-4 text-3xl font-bold text-[#0a2a1a] sm:text-4xl">
          Configuración
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Contanos qué vendés para empezar el cálculo.
        </p>

        <form
          onSubmit={handleFormSubmit}
          noValidate
          className="mt-5 flex flex-col gap-3"
        >
          {hasSuccess && !isDirty && !isPending && (
            <div role="status" className="text-sm text-green-600">
              <p>Guardado</p>
              <p>{buildConfirmation(state.data)}</p>
            </div>
          )}
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
                  className="min-h-10 rounded-full border-2 border-gray-400 bg-white px-4 text-sm font-semibold text-gray-900 aria-pressed:border-[#3ad85c] aria-pressed:bg-[#d9f7e3] aria-pressed:text-[#136831] aria-pressed:ring-2 aria-pressed:ring-[#3ad85c]/40"
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

      <LiveCostCard volume={200} />
    </>
  );
}
