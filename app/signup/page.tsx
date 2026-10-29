import SignupForm from "./signup-form";

const BENEFITS = ["Valores productivos", "Historial de precios", "Planes para compartir"];

function CalculatorMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`grid grid-cols-2 gap-0.5 rounded-[5px] bg-[#168a3d] p-1 ${className}`}>
      <span className="size-1.5 rounded-[1px] bg-white" />
      <span className="size-1.5 rounded-[1px] bg-white" />
      <span className="size-1.5 rounded-[1px] bg-white" />
      <span className="size-1.5 rounded-[1px] bg-white" />
    </span>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_0%_100%,#f8fffa_0,transparent_22rem),linear-gradient(135deg,#e7fff0_0%,#cef8da_52%,#bcf0ce_100%)] px-4 py-6 text-[#12321e] sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-4xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <section className="max-w-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#136831]">
              <CalculatorMark />
              <span>Calculadora</span>
            </div>
            <span className="rounded-full border border-[#9edeb4] bg-white/70 px-2 py-1 text-[10px] font-medium text-[#39714b]">
              Paso previo: acceso
            </span>
          </div>

          <div className="mt-5 flex size-8 items-center justify-center rounded-lg bg-[#168a3d] shadow-sm">
            <CalculatorMark className="scale-75" />
          </div>

          <h1 className="mt-4 max-w-xs text-2xl font-bold leading-tight tracking-tight text-[#12321e] sm:text-3xl">
            Guardá tus cálculos y retomalos cuando quieras
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#497154]">
            Creá tu cuenta gratis para tener tus productos, precios y escenarios siempre a mano.
          </p>

          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Beneficios de crear una cuenta">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#326842] shadow-sm">
                <span aria-hidden="true" className="text-[#168a3d]">✓</span>
                {benefit}
              </li>
            ))}
          </ul>
        </section>

        <section className="w-full rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_16px_36px_rgba(24,105,52,0.15)] sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-[#12321e]">Crear cuenta</h2>
          <p className="mt-1 text-xs text-[#5c7563]">Es gratis y te lleva un minuto.</p>
          <div className="mt-4"><SignupForm /></div>
        </section>
      </div>
    </main>
  );
}
