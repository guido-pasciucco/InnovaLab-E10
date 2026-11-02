"use client";

import { useRef, useState } from "react";

import { calculateFixedSubtotal } from "@/lib/calc/fixed-subtotal";
import { LiveCostCard } from "@/components/calculator/live-cost-card";
import {
  FixedCostsTable,
  type FixedCostRow,
  type FixedCostRowPatch,
} from "@/components/calculator/fixed-costs-table";
import { StepHeader } from "@/components/calculator/wizard/step-header";

// DEMO DATA: until #176 connects the fixed-cost service there is nothing to
// load, so the step starts from the rows of the design and can be reviewed end
// to end in `bun dev`. Remove it together with the local state below.
const DEMO_ROWS: readonly FixedCostRow[] = [
  { id: "fixed-1", name: "Alquiler", amount: "60000" },
  { id: "fixed-2", name: "Servicios", amount: "20000" },
  { id: "fixed-3", name: "Herramientas y suscripciones", amount: "10000" },
];

// Temporary ids for rows that only exist in this component; the server owns
// them once the rows are persisted (lib/AGENTS.md, rule 6).
const FIRST_NEW_ROW_NUMBER = DEMO_ROWS.length + 1;

export function FixedCostsStep() {
  // Known limitation until #176: the rows live only in this component, so
  // leaving the step and coming back resets them to the demo data.
  const [rows, setRows] = useState<readonly FixedCostRow[]>(DEMO_ROWS);
  const nextRowNumber = useRef(FIRST_NEW_ROW_NUMBER);
  const subtotal = calculateFixedSubtotal(rows);

  const handleChangeRow = (id: string, patch: FixedCostRowPatch) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const handleAddRow = () => {
    const id = `fixed-${nextRowNumber.current}`;
    nextRowNumber.current += 1;
    setRows((current) => [...current, { id, name: "", amount: "" }]);
  };

  return (
    <>
      <section className="rounded-[32px] bg-white/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
        <StepHeader
          currentStep={2}
          title="Costos fijos del mes"
          description="Lo pagás igual si vendés mucho o poco, por ejemplo el alquiler."
        />

        <div className="mt-4">
          <FixedCostsTable
            rows={rows}
            subtotal={subtotal}
            onChangeRow={handleChangeRow}
            onAddRow={handleAddRow}
          />
        </div>
      </section>

      <LiveCostCard
        fixedCosts={subtotal.ok ? (subtotal.subtotal ?? undefined) : undefined}
      />
    </>
  );
}
