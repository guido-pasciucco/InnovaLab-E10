import { formatARS } from "@/lib/money/format";

type LiveCostCardProps = {
  unitCost?: string | number;
  fixedCosts?: string | number;
  variablePerUnit?: string | number;
  volume?: number;

};

function displayMoney(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "—";
  }
  return formatARS(String(value));
}
export function LiveCostCard({
  unitCost,
  fixedCosts,
  variablePerUnit,
  volume,
}: LiveCostCardProps) {
  return (
    <div
      className="rounded-[32px] p-6 text-white shadow-[0_24px_48px_rgba(10,89,51,0.14)] bg-gradient-to-br from-[#1a5c3a] to-[#0a2a1a]">

      <p
        className="text-xs uppercase tracking-[0.2em] text-[#d3f5e1]"

      >
        COSTO UNITARIO EN VIVO
      </p>

      <div className="mt-8">
        <h2
          aria-label={`Costo unitario ${displayMoney(unitCost)}`}
          className="text-4xl font-bold"
        >
          {displayMoney(unitCost)}
        </h2>

        <div
          className="mt-4 h-2 w-16 rounded-full bg-[#39ff14]"
        />

        <p className="mt-3 text-sm text-[#d3f5e1]">
          por unidad
        </p>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between py-4">
          <span className="text-[#d3f5e1]">Costos fijos</span>
          <span className="font-medium text-white">{displayMoney(fixedCosts)}</span>
        </div>

        <div
          className="flex items-center justify-between border-t border-[#D3F5E1] py-4"
        >
          <span className="text-[#d3f5e1]">Variable por unidad</span>
          <span>{displayMoney(variablePerUnit)}</span>
        </div>

        <div
          className="flex items-center justify-between border-t border-[#D3F5E1] py-4"
        >
          <span className="text-[#d3f5e1]">Volumen</span>
          <span className="font-semibold">{volume ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}