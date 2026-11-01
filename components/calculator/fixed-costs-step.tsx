"use client";

import Link from "next/link";
import { useState } from "react";

import { calculateCostTotals } from "@/lib/calc/calculateCostTotals";

import {
  FixedCostsTable,
  type FixedCostRow,
} from "@/components/calculator/fixed-costs-table";

// Demo data until #176 connects the fixed-cost service. It mirrors the design
// so the step can be reviewed end to end in `bun dev`.
const initialRows: FixedCostRow[] = [
  { id: "fixed-1", name: "Alquiler", amount: "60000" },
  { id: "fixed-2", name: "Servicios", amount: "20000" },
  { id: "fixed-3", name: "Herramientas y suscripciones", amount: "10000" },
];

let nextId = 4;

function subtotalFor(rows: readonly FixedCostRow[]): string {
  const lines = rows
    .filter((row) => row.amount !== "")
    .map((row) => ({
      id: row.id,
      behavior: "fixed" as const,
      traceability: "direct" as const,
      isOwnLabor: false,
      amount: row.amount,
    }));

  if (lines.length === 0) {
    return "";
  }

  const totals = calculateCostTotals({ lines, volume: 1 });
  return totals.ok ? totals.subtotalFijo : "";
}

export function FixedCostsStep() {
  const [rows, setRows] = useState<FixedCostRow[]>(initialRows);
  const subtotal = subtotalFor(rows);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-16">
      <section className="rounded-[32px] bg-white p-6 shadow-[0_24px_48px_rgba(10,89,51,0.14)] sm:p-10">
        <span className="inline-flex rounded-full border border-[var(--brand-green-500,var(--color-green-500))] bg-[var(--brand-green-50,var(--color-green-50))] px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-green-700,var(--color-green-700))]">
          Paso 2 de 7
        </span>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Costos fijos del mes
        </h1>
        <p className="mt-3 text-lg text-gray-600 sm:text-xl">
          Lo pagás igual si vendés mucho o poco, por ejemplo el alquiler.
        </p>

        <div className="mt-10">
          <FixedCostsTable
            rows={rows}
            subtotal={subtotal}
            onChangeRow={(id, values) =>
              setRows((current) =>
                current.map((row) =>
                  row.id === id ? { ...row, ...values } : row,
                ),
              )
            }
            onAddRow={() => {
              const id = `fixed-${nextId}`;
              nextId += 1;
              setRows((current) => [
                ...current,
                { id, name: "", amount: "" },
              ]);
            }}
          />
        </div>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-center gap-3 sm:gap-4">
          <Link
            href="/paso-1"
            className="flex min-h-[54px] items-center justify-center rounded-[14px] text-lg font-semibold text-[var(--brand-green-700,var(--color-green-700))] transition-colors hover:bg-[var(--brand-green-50,var(--color-green-50))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green-600,var(--color-green-600))]"
          >
            Anterior
          </Link>

          {/* Navigation belongs to the wizard ticket; this is the visual step. */}
          <button
            type="button"
            className="min-h-[54px] w-full rounded-[14px] bg-[#0a7a12] px-4 py-3 text-lg font-semibold text-white transition-colors hover:bg-[#08660f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a7a12]"
          >
            Siguiente
          </button>
        </div>
      </section>
    </main>
  );
}
