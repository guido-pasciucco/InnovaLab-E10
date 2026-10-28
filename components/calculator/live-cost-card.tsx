type LiveCostCardProps = {
    unitCost?: string;
    fixedCosts?: string;
    variablePerUnit?: string;
    volume?: number;
  };
  
  export function LiveCostCard({
    unitCost,
    fixedCosts,
    variablePerUnit,
    volume,
  }: LiveCostCardProps) {
    return (
      <div
        className="relative overflow-hidden rounded-[32px] p-6 text-white shadow-2xl"
        style={{
          background:
            "linear-gradient(135deg, #0b1f10 0%, #0a7a12 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
          style={{
            backgroundColor: "#39ff14",
            opacity: 0.3,
          }}
        />
  
        <p
          className="text-xs uppercase tracking-[0.2em]"
          style={{ color: "#c8d3cc" }}
        >
          COSTO UNITARIO EN VIVO
        </p>
  
        <div className="mt-8">
          <h2
            className="text-5xl font-bold"
            style={{ color: "#39ff14" }}
          >
            {unitCost ?? "—"}
          </h2>
  
          <div
            className="mt-4 h-2 w-16 rounded-full"
            style={{ backgroundColor: "#39ff14" }}
          />
  
          <p className="mt-3 text-sm text-gray-300">
            por unidad
          </p>
        </div>
  
        <div className="mt-10">
          <div className="flex items-center justify-between py-4">
            <span>Costos fijos</span>
            <span>{fixedCosts ?? "—"}</span>
          </div>
  
          <div
            className="flex items-center justify-between border-t py-4"
            style={{ borderColor: "#4d6354" }}
          >
            <span>Variable por unidad</span>
            <span>{variablePerUnit ?? "—"}</span>
          </div>
  
          <div
            className="flex items-center justify-between border-t py-4"
            style={{ borderColor: "#4d6354" }}
          >
            <span>Volumen</span>
            <span>{volume ?? "—"}</span>
          </div>
        </div>
      </div>
    );
  }