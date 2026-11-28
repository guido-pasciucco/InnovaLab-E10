import type { Metadata } from "next";

import { FaqSection, type FaqItem } from "@/components/home/faq-section";
import { FinalCta } from "@/components/home/final-cta";
import { CheckCircleIcon, SparklesIcon } from "@/components/home/icons";
import { destinationHref, functionalityPages } from "@/components/home/navigation";
import { container, eyebrow, sectionLead, sectionTitle } from "@/components/home/styles";
import { PageHero } from "@/components/marketing/page-hero";
import { getOptionalUser } from "@/lib/auth/optional-user";

export const metadata: Metadata = {
  title: "Numora | Asistente IA",
  description:
    "Preguntale a Numora en lenguaje natural sobre los datos de tu cuenta y obtené respuestas con tablas y gráficos.",
};

const assistant = functionalityPages[2];

// The same three prompts the app offers in /chat-datos, so they are known to
// work against the account's data instead of being invented marketing copy.
const exampleQuestions = [
  "¿Cuántos productos tengo cargados?",
  "¿Qué insumos son los más caros?",
  "¿Cuáles son mis gastos del negocio?",
] as const;

const faqs: readonly FaqItem[] = [
  {
    question: "¿La IA puede cambiar mis datos?",
    answer:
      "No. El chat solo puede leer los datos de tu cuenta: no carga, edita ni borra insumos, productos, precios ni gastos.",
  },
  {
    question: "¿Qué datos usa?",
    answer:
      "Solo los de tu cuenta. La sesión decide qué información se consulta y las respuestas se arman con esos datos y la documentación de la aplicación.",
  },
];

export default async function AssistantPage() {
  const user = await getOptionalUser();
  const ctaHref = destinationHref(assistant.destination, user !== null);

  return (
    <main>
      <PageHero
        eyebrow="Asistente IA"
        title="Preguntale a tus datos"
        highlight="y entendé tu negocio hablando."
        description="Escribí una pregunta en lenguaje natural y Numora responde con los datos de tu cuenta."
        ctaHref={ctaHref}
        ctaLabel={assistant.ctaLabel}
        anchorLabel="Qué es?"
        anchorHref="#chat-con-tus-datos"
        icon={SparklesIcon}
        stats={[
          { value: "Lenguaje natural", label: "preguntás como hablás, sin comandos especiales" },
          { value: "Información fácil de interpretar" },
          { value: "Solo tu cuenta", label: "el chat consulta únicamente tus propios datos" },
        ]}
      />

      <section
        id="chat-con-tus-datos"
        aria-labelledby="chat-title"
        className="scroll-mt-36 border-y border-border-default bg-surface py-16 sm:py-20"
      >
        <div className={`${container} grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start`}>
          <div>
            <p className={eyebrow}>Qué es?</p>
            <h2 id="chat-title" className={sectionTitle}>
              Una pregunta, una respuesta con tus números
            </h2>
            <p className={sectionLead}>
              El asistente consulta los datos que ya cargaste en la aplicación y te los devuelve en
              lenguaje claro. La conversación queda en tu navegador, en esa pestaña.
            </p>
            <p className="mt-4 text-sm leading-6 text-fg-muted">
              Es una herramienta en prueba: revisá los números importantes antes de decidir.
            </p>
          </div>
          <div className="rounded-2xl border border-border-default bg-surface-tint p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-link">
              Preguntas de ejemplo
            </p>
            <ul className="mt-4 space-y-3">
              {exampleQuestions.map((question) => (
                <li
                  key={question}
                  className="rounded-xl border border-border-default bg-surface px-4 py-3 text-sm font-medium text-fg"
                >
                  {question}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="mora" aria-labelledby="mora-title" className="scroll-mt-36 py-16 sm:py-20">
        <div className={container}>
          <div className="max-w-3xl">
            <p className={eyebrow}>Mora</p>
            <h2 id="mora-title" className={sectionTitle}>
              Tu asistente dentro de la plataforma.
            </h2>
            <p className={sectionLead}>
              Mora es el asistente de ayuda de la aplicación: te explica dónde se carga cada dato y
              qué significa cada resultado, sin salir de la pantalla en la que estás.
            </p>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              "Dónde cargar insumos, productos y gastos.",
              "Qué significa el costo total y el margen.",
              "Cómo se llega al punto de equilibrio.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-2xl border border-border-default bg-surface-tint p-5 text-sm leading-6 text-fg-muted">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-link" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="privacidad"
        aria-labelledby="assistant-privacy-title"
        className="scroll-mt-36 border-y border-border-default bg-surface py-16 sm:py-20"
      >
        <div className={`${container} grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center`}>
          <div>
            <p className={eyebrow}>Tus datos seguros</p>
            <h2 id="assistant-privacy-title" className={sectionTitle}>
              El chat solo lee lo que es tuyo
            </h2>
            <p className={sectionLead}>
              La sesión determina qué datos puede consultar el asistente. No modifica nada: solo
              consulta información de tu cuenta.
            </p>
          </div>
          <div className="rounded-2xl border border-border-default bg-surface-tint p-6">
            <ul className="space-y-3">
              {[
                "El asistente consulta únicamente los datos asociados a tu cuenta.",
                "Las consultas son de lectura: no cargan, editan ni borran información.",
                "Tus datos no se usan para publicidad ni se comparten con terceros.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-fg-muted">
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-link" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <FaqSection
        title="Sobre el asistente"
        lead="Las dudas más comunes antes de usar el chat."
        faqs={faqs}
      />
      <FinalCta
        ctaHref={ctaHref}
        ctaLabel={assistant.ctaLabel}
        title="¿Tenés una pregunta sobre tus datos?"
        description="Ingresá a tu cuenta y preguntale al asistente lo que quieras saber."
      />
    </main>
  );
}
