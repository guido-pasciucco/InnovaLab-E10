import { formatARS } from "@/lib/money/format";

type LiveCostCardProps = {
  unitCost?: string;
  fixedCosts?: string;
  variablePerUnit?: string;
  volume?: number;
};

function displayMoney(value?: string) {
  if (value === undefined || value === "") {
    return "—";
  }

  const formatted = formatARS(value);
  return formatted === "" ? "—" : formatted;
}

export function LiveCostCard({
  unitCost,
  fixedCosts,
  variablePerUnit,
  volume,
}: LiveCostCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1a5c3a] to-[#0a2a1a] p-6 text-white shadow-[0_24px_48px_rgba(10,89,51,0.14)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-[#d3f5e1]/30 blur-3xl"
      />

      <div className="relative">
        <p className="text-xs uppercase tracking-[0.2em] text-[#d3f5e1]">
          COSTO UNITARIO EN VIVO
        </p>

        <div className="mt-8">
          <h2
            aria-label={`Costo unitario ${displayMoney(unitCost)}`}
            className="text-4xl font-bold"
          >
            {displayMoney(unitCost)}
          </h2>

          <div className="mt-4 h-2 w-16 rounded-full bg-[#d3f5e1]" />

          <p className="mt-3 text-sm text-[#d3f5e1]">por unidad</p>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between py-4">
            <span className="text-[#d3f5e1]">Costos fijos</span>
            <span className="font-medium text-white">{displayMoney(fixedCosts)}</span>
          </div>

          <div className="flex items-center justify-between border-t border-[#d3f5e1] py-4">
            <span className="text-[#d3f5e1]">Variable por unidad</span>
            <span>{displayMoney(variablePerUnit)}</span>
          </div>

          <div className="flex items-center justify-between border-t border-[#d3f5e1] py-4">
            <span className="text-[#d3f5e1]">Volumen</span>
            <span className="font-semibold">{volume ?? "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
