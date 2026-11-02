import { StepNav } from "@/components/calculator/wizard/step-nav";

// Navigation-only placeholder: the break-even summary and charts go here.
export default function ResultadosPage() {
  return (
    <section className="rounded-[32px] bg-white/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
      <h1 className="text-3xl font-bold text-[#0a2a1a] sm:text-4xl">
        Resultados
      </h1>
      <p className="mt-2 text-base text-gray-600">
        Esta pantalla todavía no está disponible.
      </p>
      <StepNav previous="/paso-7" />
    </section>
  );
}
