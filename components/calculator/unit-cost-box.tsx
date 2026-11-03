import { formatARSCompact } from "@/lib/money/format";

type UnitCostBoxProps = {
  // The persisted summary's unit cost, a decimal string; null when unavailable.
  unitCost: string | null;
};

// The highlighted "Costo unitario" of step 4. It shows the same persisted
// value as the shell's live card, so the two never diverge.
export function UnitCostBox({ unitCost }: UnitCostBoxProps) {
  const text = (unitCost !== null && formatARSCompact(unitCost)) || "—";

  return (
    <div
      role="group"
      aria-label="Costo unitario"
      className="mt-6 rounded-[20px] border border-brand-green-500 bg-gradient-to-br from-brand-green-50 to-brand-green-100 p-5"
    >
      <p aria-hidden="true" className="text-sm font-semibold uppercase text-brand-green-700">Costo unitario</p>
      <p aria-live="polite" className="mt-1 text-4xl font-bold text-brand-green-700">
        {text}
      </p>
    </div>
  );
}
