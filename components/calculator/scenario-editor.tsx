"use client";

import { useState, useTransition, type FormEvent } from "react";

import { deleteScenario, updateScenario } from "@/app/(calculator)/paso-7/actions";
import { CostLineDeleteButton } from "@/components/calculator/cost-line-delete-button";
import { TextField } from "@/components/ui/text-field";
import { getFieldErrors, type FieldErrorMessages } from "@/lib/errors/field-errors";
import { parseAmountInput } from "@/lib/money/format";
import { scenarioNameField } from "@/lib/schemas/calculation/fields";
import { volumeField } from "@/lib/schemas/calculator-setup/fields";
import type { CalculatorScenario } from "@/lib/types/calculator";

type ScenarioEditorProps = {
  scenario: CalculatorScenario;
  // Shown as placeholders: an empty field keeps the base value.
  basePrice: string | null;
  baseVolume: number | null;
};

const SAVE_FAILED = "No pudimos guardar el escenario. Probá de nuevo.";
const DELETE_FAILED = "No pudimos eliminar el escenario. Probá de nuevo.";
const ZERO_PRICE = "El precio tiene que ser mayor que 0.";

type Parsed =
  | { ok: true; input: { name: string; priceOverride: string | null; volumeOverride: number | null } }
  | { ok: false; errors: FieldErrorMessages };

// Checks the fields with the same rules the server applies, so the user reads
// the message under the field before anything is sent. Empty overrides are
// null: the scenario keeps the base value.
function parse(name: string, priceText: string, volumeText: string): Parsed {
  const errors: FieldErrorMessages = {};

  const parsedName = scenarioNameField.safeParse(name);
  if (!parsedName.success) errors.name = parsedName.error.issues[0]?.message;
  const cleanName = parsedName.success ? parsedName.data : name;

  let priceOverride: string | null = null;
  if (priceText.trim() !== "") {
    const price = parseAmountInput(priceText);
    if (price.issue !== null) errors.priceOverride = price.issue;
    else if (/^0+(\.0+)?$/.test(price.amount)) errors.priceOverride = ZERO_PRICE;
    else priceOverride = price.amount;
  }

  let volumeOverride: number | null = null;
  if (volumeText.trim() !== "") {
    const volume = volumeField.safeParse(Number(volumeText.trim()));
    if (!volume.success) errors.volumeOverride = volume.error.issues[0]?.message;
    else volumeOverride = volume.data;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    input: { name: cleanName, priceOverride, volumeOverride },
  };
}

// One alternative: its name, a manual price and a volume. The base is never
// edited, so it has no editor. Saving re-renders the comparison on the server.
export function ScenarioEditor({ scenario, basePrice, baseVolume }: ScenarioEditorProps) {
  const [name, setName] = useState(scenario.name);
  const [priceText, setPriceText] = useState(scenario.priceOverride?.replace(".", ",") ?? "");
  const [volumeText, setVolumeText] = useState(scenario.volumeOverride?.toString() ?? "");
  const [errors, setErrors] = useState<FieldErrorMessages>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parse(name, priceText, volumeText);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setFailure(null);
    startTransition(async () => {
      const result = await updateScenario({ scenarioId: scenario.id, ...parsed.input });
      if (result.ok) return;
      const fieldErrors = getFieldErrors(result);
      if (result.code === "CALC_SCENARIO_INVALID_PRICE") setErrors({ priceOverride: ZERO_PRICE });
      else if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else setFailure(SAVE_FAILED);
    });
  };

  const handleDelete = () => {
    setFailure(null);
    startTransition(async () => {
      const result = await deleteScenario(scenario.id);
      if (!result.ok) setFailure(DELETE_FAILED);
    });
  };

  return (
    <form
      aria-label={`Editar ${scenario.name}`}
      onSubmit={handleSubmit}
      aria-busy={isPending || undefined}
      className="flex flex-col gap-3 rounded-[20px] border border-border-default bg-surface p-4 sm:p-5"
    >
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <TextField
            label="Nombre del escenario"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            error={errors.name}
          />
        </div>
        <CostLineDeleteButton
          label={`Eliminar ${scenario.name}`}
          onClick={handleDelete}
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="Precio de venta"
          value={priceText}
          onChange={(event) => setPriceText(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          placeholder={basePrice ?? undefined}
          error={errors.priceOverride}
        />
        <TextField
          label="Unidades del mes"
          value={volumeText}
          onChange={(event) => setVolumeText(event.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder={baseVolume?.toString()}
          error={errors.volumeOverride}
        />
      </div>
      <p className="text-sm text-fg-muted">
        Dejá un campo vacío para usar el valor de la base.
      </p>

      {failure && (
        <p role="alert" className="text-sm text-danger">
          {failure}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-[14px] border border-brand-green-600 px-4 py-2 text-base font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60 sm:w-auto sm:self-end"
      >
        Guardar escenario
      </button>
    </form>
  );
}
