import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";

import LoginForm from "./login-form";

const BENEFITS = ["Costo unitario", "Precio sugerido", "Punto de equilibrio"];

export default function LoginPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_0%_100%,#f8fffa_0,transparent_22rem),linear-gradient(135deg,#e7fff0_0%,#cef8da_52%,#bcf0ce_100%)] px-4 py-6 text-[#12321e] sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[64rem] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_25.25rem] lg:gap-10">
        <AuthHeroPanel
          brand="Calculadora de Costos"
          badge="Paso previo: acceso"
          title="Conocé el costo real de lo que vendés"
          description="Calculá costos, precio sugerido y punto de equilibrio con un recorrido guiado."
          benefits={BENEFITS}
          benefitsLabel="Beneficios de la calculadora"
          footnote="Herramienta de apoyo. No reemplaza asesoramiento contable o impositivo."
        />

        <section className="w-full rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_16px_36px_rgba(24,105,52,0.15)] sm:p-6 lg:p-7">
          <h2 className="text-xl font-bold tracking-tight text-[#12321e] lg:text-[24px]">Iniciar sesión</h2>
          <p className="mt-1 text-xs text-[#5c7563] lg:text-base">Ingresá para guardar y retomar tus cálculos.</p>
          <div className="mt-4">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
