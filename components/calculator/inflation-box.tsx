"use client";

import { useState } from "react";

import { TextField } from "@/components/ui/text-field";
import type { ScenarioComparisonInputs } from "@/lib/types/calculator";

import { toInflationValues } from "./scenarios-step-values";

// A what-if on the base: typed in the browser, computed with the pure engine
// and never saved (automatic inflation indices are out of the MVP).
const DEFAULT_INCREASE = "10";

export function InflationBox({ inputs }: { inputs: ScenarioComparisonInputs }) {
  const [increaseText, setIncreaseText] = useState(DEFAULT_INCREASE);
  const values = toInflationValues(inputs, increaseText);

  return (
    <section
      aria-labelledby="inflation-title"
      className="mt-6 rounded-[20px] border border-border-default bg-[#f7faf8] p-4 sm:p-5"
    >
      <h2
        id="inflation-title"
        className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-green-700"
      >
        Ajuste por inflación
      </h2>

      <div className="mt-3">
        <TextField
          label="Aumento esperado de tus costos variables (%)"
          value={increaseText}
          onChange={(event) => setIncreaseText(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          placeholder={DEFAULT_INCREASE}
          error={values.issue ?? undefined}
        />
      </div>

      <div aria-live="polite" className="mt-3 flex flex-col gap-2 text-base text-fg">
        {values.summary && <p>{values.summary}</p>}
        {values.keepMargin && <p className="font-semibold">{values.keepMargin}</p>}
      </div>
    </section>
  );
}
