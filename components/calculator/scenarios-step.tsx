import Link from "next/link";

import { createCalculation } from "@/app/dashboard/actions";
import { duplicateScenario } from "@/app/(calculator)/paso-7/actions";
import { InflationBox } from "@/components/calculator/inflation-box";
import { ScenarioEditor } from "@/components/calculator/scenario-editor";
import { StepHeader } from "@/components/calculator/wizard/step-header";
import { MAX_SCENARIOS, type CompareScenariosResult } from "@/lib/calc/compareScenarios";
import type { CalculatorScenario, ScenarioComparisonInputs } from "@/lib/types/calculator";

import {
  toScenariosStepValues,
  type ScenarioCell,
  type ScenarioColumn,
} from "./scenarios-step-values";

type ScenariosStepProps = {
  // Base first, then the alternatives by creation.
  scenarios: CalculatorScenario[];
  // Null while the costs or the margin are missing.
  comparison: CompareScenariosResult | null;
  inputs: ScenarioComparisonInputs | null;
};

const MESSAGES = {
  "missing-inputs":
    "Cargá tus costos en los pasos 2 y 3 y tu margen en el paso 5 para comparar escenarios.",
  invalid: "No pudimos comparar tus escenarios. Revisá el precio y el volumen de cada uno.",
} as const;

const ROWS: { label: string; cell: (column: ScenarioColumn) => ScenarioCell }[] = [
  { label: "Precio", cell: (column) => column.price },
  { label: "Margen real", cell: (column) => column.realMargin },
  { label: "Ganancia estimada", cell: (column) => column.estimatedProfit },
  { label: "Unidades de equilibrio", cell: (column) => column.breakEvenUnits },
];

const BUTTON =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[14px] px-4 py-2 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:w-auto sm:min-w-36";
const SECONDARY = `${BUTTON} border border-brand-green-600 text-brand-green-700 hover:bg-brand-green-50 disabled:cursor-not-allowed disabled:border-border-default disabled:text-fg-disabled disabled:hover:bg-transparent`;
const PREVIOUS = `${BUTTON} text-brand-green-700 hover:bg-brand-green-50`;
const PRIMARY = `${BUTTON} bg-action-primary text-on-action-primary hover:bg-action-primary-hover`;

// The base column comes from steps 1-6 and is read-only; each alternative is
// edited below the table. The comparison is computed on the server, so every
// save re-renders the table with the figures the engine just produced.
export function ScenariosStep({ scenarios, comparison, inputs }: ScenariosStepProps) {
  const values = toScenariosStepValues({ scenarios, comparison });
  const base = scenarios.find((scenario) => scenario.isBase);
  const alternatives = scenarios.filter((scenario) => !scenario.isBase);
  const atLimit = scenarios.length >= MAX_SCENARIOS;
  const baseColumn = values.columns?.find((column) => column.isBase);

  return (
    <section className="rounded-[32px] bg-surface/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
      <StepHeader
        currentStep={7}
        badge="Comparación"
        title="Comparar escenarios"
        description="El escenario base nunca se pisa: probá cambios y mirá el impacto."
      />

      {values.status === "ready" ? (
        <ComparisonTable columns={values.columns} />
      ) : (
        <p role="status" className="mt-6 text-base text-fg-muted">
          {MESSAGES[values.status]}
        </p>
      )}

      {alternatives.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {alternatives.map((scenario) => (
            <ScenarioEditor
              key={scenario.id}
              scenario={scenario}
              basePrice={baseColumn?.price.value ?? null}
              baseVolume={inputs?.volume ?? null}
            />
          ))}
        </div>
      )}

      {base && (
        <form action={duplicateScenario} className="mt-6 flex flex-col gap-2">
          <input type="hidden" name="scenarioId" value={base.id} />
          <button type="submit" disabled={atLimit} className={SECONDARY}>
            Duplicar escenario
          </button>
          {atLimit && (
            <p className="text-sm text-fg-muted">
              Podés comparar hasta {MAX_SCENARIOS} escenarios. Eliminá uno para probar otro.
            </p>
          )}
        </form>
      )}

      {inputs && values.status === "ready" && <InflationBox inputs={inputs} />}

      <nav
        aria-label="Navegación entre pasos"
        className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <Link href="/paso-6" className={PREVIOUS}>
          Anterior
        </Link>
        <form action={createCalculation} className="contents">
          <button type="submit" className={PRIMARY}>
            Nuevo cálculo
          </button>
        </form>
      </nav>
    </section>
  );
}

function ComparisonTable({ columns }: { columns: ScenarioColumn[] }) {
  return (
    // The table keeps its columns on a phone and scrolls inside its own box.
    <div className="mt-6 overflow-x-auto rounded-[20px] border border-border-default">
      <table className="w-full min-w-[32rem] border-collapse text-left">
        <caption className="sr-only">Comparación de escenarios contra la base</caption>
        <thead>
          <tr className="bg-[#f7faf8]">
            <td className="p-3" />
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={`p-3 text-sm font-semibold ${column.isBase ? "text-brand-green-700" : "text-fg"}`}
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-t border-border-default">
              <th scope="row" className="p-3 text-sm font-semibold text-fg-muted">
                {row.label}
              </th>
              {columns.map((column) => {
                const cell = row.cell(column);
                return (
                  <td key={column.id} className="p-3 align-top">
                    <span className="block text-lg font-bold tabular-nums text-fg">{cell.value}</span>
                    {cell.delta && (
                      <span className="mt-1 block text-sm text-fg-muted">{cell.delta}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
