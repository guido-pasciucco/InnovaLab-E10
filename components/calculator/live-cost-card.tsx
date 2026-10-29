import { formatARS } from "@/lib/money/format";

type LiveCostCardProps = {
    unitCost?: string | number;
    fixedCosts?: string | number;
    variablePerUnit?: string | number;
    volume?: number;

  }; 

  function displayMoney(value?: string | number) {
    if ( value === undefined || value === null || value === "") {
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
        className="rounded-[32px] bg-[#BDEBCF] p-6 text-[#0B1F10] shadow-lg">
        <p
          className="text-xs uppercase tracking-[0.2em] text-[#4D6354]"
         
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
            className="mt-4 h-2 w-16 rounded-full bg-[#D3F5E1]" 
          />
  
          <p className="mt-3 text-sm text-[#4D6354]">
            por unidad
          </p>
        </div>
  
        <div className="mt-10">
          <div className="flex items-center justify-between py-4">
            <span>Costos fijos</span>
            <span>{displayMoney(fixedCosts)}</span>
          </div>
  
          <div
            className="flex items-center justify-between border-t border-[#D3F5E1] py-4"
          >
            <span>Variable por unidad</span>
            <span>{displayMoney(variablePerUnit)}</span>
          </div>
  
          <div
            className="flex items-center justify-between border-t border-[#D3F5E1] py-4"
          >
            <span>Volumen</span>
            <span>{volume ?? "—"}</span>
          </div>
        </div>
      </div>
    );
  }