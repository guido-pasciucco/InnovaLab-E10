"use client";

import { useState, useTransition } from "react";

import { continueToStep6, saveExpectedMargin } from "@/app/(calculator)/paso-5/actions";
import { StepHeader } from "@/components/calculator/wizard/step-header";
import { StepNav } from "@/components/calculator/wizard/step-nav";
import { TextField } from "@/components/ui/text-field";

import { toPricingStepValues, type PricingCosts } from "./pricing-step-values";

// Shown until the user saves their own margin: the engine docs and the step 5
// mockup both use 30 % as the example margin.
const DEFAULT_MARGIN = "30";

const SAVE_FAILED = "No pudimos guardar el margen. Probá de nuevo.";

type PricingStepProps = {
  // Persisted cost summary; null when it could not be read.
  costs: PricingCosts | null;
  // Saved expected margin ("30"), or null when nothing was saved yet.
  savedMargin: string | null;
};

const CARD = "rounded-[20px] border border-border-default bg-surface p-4 sm:p-5";
const CARD_LABEL = "text-sm font-semibold text-fg-muted";
const CARD_VALUE = "mt-1 text-2xl font-bold tabular-nums text-fg";

// The live values are computed in the browser with the same pure engine the
// server uses, from the typed margin and the persisted costs. The margin is
// saved when the field is left (like the cost amounts of steps 2 and 3) and
// again before "Siguiente" if it changed since.
export function PricingStep({ costs, savedMargin }: PricingStepProps) {
  const [marginText, setMarginText] = useState(savedMargin ?? DEFAULT_MARGIN);
  const [lastSaved, setLastSaved] = useState(savedMargin);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const values = toPricingStepValues(costs, marginText);

  const save = async (margin: string): Promise<boolean> => {
    const result = await saveExpectedMargin({ expectedMarginPct: margin });
    if (!result.ok) {
      setSaveError(SAVE_FAILED);
      return false;
    }
    setLastSaved(margin);
    return true;
  };

  const handleBlur = () => {
    const margin = values.marginValue;
    if (margin === null || margin === lastSaved || isPending) return;
    startTransition(async () => {
      await save(margin);
    });
  };

  // "Siguiente": an invalid margin stays on the step with its message; a
  // margin not saved yet (the default, or an edit) is saved first.
  const handleNext = async () => {
    const margin = values.marginValue;
    if (margin === null) return;
    if (margin !== lastSaved && !(await save(margin))) return;
    await continueToStep6();
  };

  return (
    <section className="rounded-[32px] bg-surface/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
      <StepHeader
        currentStep={5}
        title="Margen y precio sugerido"
        description="Elegí cuánto querés ganar de cada venta y mirá el precio que te conviene."
      />

      <div className="mt-6 flex flex-col gap-2">
        <TextField
          label="Margen esperado (%)"
          value={marginText}
          onChange={(event) => {
            setMarginText(event.target.value);
            setSaveError(null);
          }}
          onBlur={handleBlur}
          inputMode="decimal"
          autoComplete="off"
          placeholder={DEFAULT_MARGIN}
          error={values.marginIssue ?? undefined}
          aria-busy={isPending || undefined}
        />
        <p className="text-sm text-fg-muted">
          Margen = ganancia ÷ precio de venta.
          {values.marginValue !== null &&
            ` Con ${values.marginLabel} %, de cada $100 que cobrás, $${values.marginLabel} son ganancia.`}
          {values.markupLabel !== null &&
            ` Equivale a sumarle un ${values.markupLabel} % a tu costo.`}
        </p>
        {saveError && (
          <p role="alert" className="text-sm text-danger">
            {saveError}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div role="group" aria-label="Costo unitario" className={CARD}>
          <p className={CARD_LABEL}>Costo unitario</p>
          <p className={CARD_VALUE}>{values.unitCost}</p>
        </div>

        <div
          role="group"
          aria-label="Precio sugerido"
          className="rounded-[20px] border-2 border-brand-green-500 bg-gradient-to-br from-brand-green-50 to-surface p-4 sm:p-5"
        >
          <p className="text-sm font-semibold text-brand-green-700">Precio sugerido</p>
          <p aria-live="polite" className="mt-1 text-4xl font-bold tabular-nums text-brand-green-700">
            {values.suggestedPrice}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div role="group" aria-label="Contribución por unidad" className={CARD}>
            <p className={CARD_LABEL}>Contribución por unidad</p>
            <p className={CARD_VALUE}>{values.contributionUnit}</p>
          </div>
          <div role="group" aria-label="Ganancia estimada" className={CARD}>
            <p className={CARD_LABEL}>Ganancia estimada</p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${values.profitIsNegative ? "text-danger" : "text-brand-green-600"}`}
            >
              {values.estimatedProfit}
            </p>
          </div>
        </div>

        {values.missingCosts && (
          <p className="text-sm text-fg-muted">
            Cargá tus costos en los pasos 2 y 3 para ver el precio sugerido.
          </p>
        )}
        {values.lowContribution && (
          <p role="status" className="rounded-[14px] bg-warning-subtle px-4 py-3 text-sm text-warning">
            Con este precio, cada venta no deja nada para cubrir los costos fijos. Probá con un
            margen más alto.
          </p>
        )}
      </div>

      <StepNav previous="/paso-4" nextAction={handleNext} />
    </section>
  );
}
