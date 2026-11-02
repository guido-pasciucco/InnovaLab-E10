import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inicio - Calculadora de Costos y Precios",
};

type Feature = {
  title: string;
  description: string;
};

const features: readonly Feature[] = [
  {
    title: "Gestión de Costos",
    description: "Cargá tus costos fijos y variables para conocer exactamente cuánto te cuesta producir.",
  },
  {
    title: "Definición de Precios",
    description: "Establecé precios competitivos basados en tus costos reales y el margen deseado.",
  },
  {
    title: "Punto de Equilibrio",
    description: "Visualizá cuántas unidades necesitás vender para cubrir tus gastos y ganar.",
  },
];

const CALCULATOR_START_HREF = "/paso-1";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl h-[calc(100vh-2.5rem)] flex-col justify-between px-6 py-6 relative z-10 overflow-hidden">
      {/* Hero Section */}
      <section aria-labelledby="hero-title" className="flex flex-col items-center text-center md:items-start md:text-left gap-4 pt-2">
        {/* Logo de la cuadrícula */}
        <div className="inline-flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <span className="font-bold text-slate-800 text-base tracking-tight">Calculadora</span>
        </div>
        
        <h1 id="hero-title" className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
          Calculadora de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Costos y Precios</span>
        </h1>
        
        <p className="text-base md:text-lg leading-relaxed text-slate-700 max-w-2xl font-medium">
          Optimizá la rentabilidad de tu negocio calculando costos, márgenes y tu punto exacto de equilibrio de forma simple y precisa.
        </p>

        {/* CTA Principal: fondo verde de inicio y hover con borde blanco */}
        <div className="pt-2">
          <Link
            href={CALCULATOR_START_HREF}
            className="relative inline-flex items-center justify-center overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white font-extrabold text-base md:text-lg px-9 py-4 rounded-2xl shadow-xl shadow-emerald-500/35 border-2 border-emerald-400/40 transition-all duration-300 hover:scale-[1.03] hover:border-white hover:shadow-2xl hover:shadow-emerald-500/50 active:scale-[0.98] group"
          >
            {/* Haz de luz continuo */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-glint pointer-events-none" />
            <span className="relative z-10">Iniciar Cálculo</span>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section aria-labelledby="features-title" className="flex flex-col gap-4 my-auto">
        <h2 id="features-title" className="text-xl md:text-2xl font-extrabold text-slate-900 text-center md:text-left">
          ¿Qué podés hacer?
        </h2>

        <ul className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="relative overflow-hidden flex flex-col justify-between rounded-2xl border border-emerald-900/15 p-6 bg-white/85 backdrop-blur-xl shadow-md hover:shadow-2xl hover:border-emerald-500 hover:-translate-y-1.5 transition-all duration-300 group"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500/30 group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-teal-400 transition-all duration-300" />
              
              <div className="pt-1">
                <h3 className="font-bold text-lg md:text-xl text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 font-normal">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer: botones con fondo verde inicial que pasan a blanco con texto verde en hover */}
      <footer className="pt-4 border-t border-slate-300/70 flex items-center justify-center pb-2">
        <nav aria-label="Cuenta" className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-700 border-2 border-emerald-600 shadow-md transition-all duration-300 hover:bg-white hover:text-emerald-800 hover:border-emerald-600 hover:shadow-lg active:scale-[0.98]"
          >
            Iniciar sesión
          </Link>
          <Link 
            href="/signup" 
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-700 border-2 border-emerald-600 shadow-md transition-all duration-300 hover:bg-white hover:text-emerald-800 hover:border-emerald-600 hover:shadow-lg active:scale-[0.98]"
          >
            Crear cuenta
          </Link>
        </nav>
      </footer>
    </main>
  );
}