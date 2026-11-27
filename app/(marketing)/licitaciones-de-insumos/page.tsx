import type { Metadata } from "next";

import { FaqSection, type FaqItem } from "@/components/home/faq-section";
import { FinalCta } from "@/components/home/final-cta";
import { CheckCircleIcon, PackageIcon } from "@/components/home/icons";
import { destinationHref, functionalityPages } from "@/components/home/navigation";
import { container, eyebrow, sectionLead, sectionTitle } from "@/components/home/styles";
import { PageHero } from "@/components/marketing/page-hero";
import { getOptionalUser } from "@/lib/auth/optional-user";

export const metadata: Metadata = {
  title: "Numora | Licitaciones de insumos",
  description:
    "Publicá una compra de insumos con precio de partida y compará ofertas cerradas por rondas de tus proveedores registrados.",
};

const tenders = functionalityPages[1];

const steps = [
  {
    number: "01",
    title: "Registrar proveedores",
    description:
      "Generás un enlace personal por proveedor. Complete sus datos, confirme su correo y quede vinculado a tu negocio.",
  },
  {
    number: "02",
    title: "Publicar la compra",
    description:
      "Elegís entre 1 y 20 insumos del catálogo, cargás cantidades y precio de partida, y fijás el porcentaje de baja, la duración de cada ronda y cuántas rondas habrá.",
  },
  {
    number: "03",
    title: "Rondas automáticas",
    description:
      "Cada ronda tiene un precio objetivo nuevo. Los proveedores bajan o ratifican su oferta sin ver a los demás; la aplicación avanza las rondas por vos.",
  },
  {
    number: "04",
    title: "Comparar ofertas",
    description:
      "Al cierre ves un cuadro por insumo con la última oferta de cada proveedor y la diferencia contra el precio de partida y el del catálogo.",
  },
  {
    number: "05",
    title: "Elegir y generar la orden",
    description:
      "Elegís con quién comprar cada insumo, acordás el precio y generás una orden imprimible. Las ofertas no son vinculantes.",
  },
] as const;

const providerPoints = [
  "Se registran con un enlace personal que sirve una sola vez y vence a los 7 días.",
  "Cargan negocio, CUIT, contacto y rubros; la cuenta se crea recién al confirmar el correo.",
  "Ven en su panel las licitaciones de los negocios con los que están vinculados, separadas.",
  "Nunca ven a los otros proveedores, sus ofertas ni el precio de tu catálogo.",
] as const;

const faqs: readonly FaqItem[] = [
  {
    question: "¿La app cobra o paga por mí?",
    answer:
      "No. La aplicación organiza las ofertas y registra las decisiones, pero no interviene en el pago, la entrega ni el contrato: eso se acuerda entre las dos partes.",
  },
  {
    question: "¿Mis proveedores ven a la competencia?",
    answer:
      "No. Cada proveedor ve los términos de la licitación y su propia oferta. No sabe cuántos compiten, ni ve precios u ofertas de los demás.",
  },
  {
    question: "¿Puedo cambiar una licitación después de publicarla?",
    answer:
      "No. Publicada, no se modifica: solo puede cancelarse antes del cierre. Para comprar otro insumo podés publicar una licitación nueva.",
  },
];

export default async function TendersPage() {
  const user = await getOptionalUser();
  const ctaHref = destinationHref(tenders.destination, user !== null);

  return (
    <main>
      <PageHero
        eyebrow="Licitaciones de insumos"
        title="Comprá insumos con"
        highlight="ofertas cerradas por rondas."
        description="Publicá lo que necesitás comprar, poné un precio de partida y dejá que tus proveedores compitan con ofertas que nadie más ve. Después elegís con quién comprar."
        ctaHref={ctaHref}
        ctaLabel={tenders.ctaLabel}
        anchorLabel="Qué es"
        anchorHref="#que-es"
        icon={PackageIcon}
        stats={[
          { value: "1 a 20 insumos", label: "por licitación, con cantidades y especificaciones" },
          { value: "1 a 24 hs", label: "de duración por ronda, 6 hs por defecto" },
          { value: "2 a 5 rondas", label: "con un precio objetivo nuevo en cada una" },
        ]}
      />

      <section
        id="que-es"
        aria-labelledby="what-is-title"
        className="scroll-mt-36 border-y border-border-default bg-surface py-16 sm:py-20"
      >
        <div className={`${container} grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center`}>
          <div>
            <p className={eyebrow}>Qué es</p>
            <h2 id="what-is-title" className={sectionTitle}>
              Una compra de insumos que decide el emprendedor
            </h2>
            <p className={sectionLead}>
              Publicás una compra con un precio de partida y tus proveedores compiten con ofertas
              cerradas por rondas, sin ver a los demás. Vos elegís con quién comprar.
            </p>
          </div>
          <div className="rounded-2xl border border-border-default bg-surface-tint p-6">
            <ul className="space-y-3">
              {[
                "La aplicación ejecuta las reglas, notifica en el panel y compara las ofertas.",
                "No adjudica ni elige por vos: la decisión es tuya, insumo por insumo.",
                "No interviene en el pago, la entrega ni el contrato.",
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

      <section
        id="como-funciona"
        aria-labelledby="tender-steps-title"
        className="scroll-mt-36 py-16 sm:py-20"
      >
        <div className={container}>
          <div className="max-w-3xl">
            <p className={eyebrow}>El recorrido</p>
            <h2 id="tender-steps-title" className={sectionTitle}>
              De la invitación a la orden de compra
            </h2>
            <p className={sectionLead}>
              Los avisos aparecen en el panel de cada persona: no se envían correos ni mensajes fuera
              de la aplicación.
            </p>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step) => (
              <li key={step.number} className="flex h-full flex-col rounded-2xl border border-border-default bg-surface-tint p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-action-tonal text-xs font-bold text-link">
                  {step.number}
                </span>
                <h3 className="mt-4 text-base font-semibold text-fg">{step.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-fg-muted">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="proveedores"
        aria-labelledby="providers-title"
        className="scroll-mt-36 border-y border-border-default bg-surface py-16 sm:py-20"
      >
        <div className={container}>
          <div className="max-w-3xl">
            <p className={eyebrow}>Tus proveedores</p>
            <h2 id="providers-title" className={sectionTitle}>
              Cada proveedor ve solo lo suyo
            </h2>
            <p className={sectionLead}>
              El enlace de registro es personal y se muestra una sola vez. Tu proveedor carga sus
              datos una vez y puede participar en todas las licitaciones para las que lo invites.
            </p>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {providerPoints.map((point) => (
              <li key={point} className="flex items-start gap-3 rounded-2xl border border-border-default bg-surface-tint p-5 text-sm leading-6 text-fg-muted">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-link" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FaqSection
        title="Preguntas sobre licitaciones"
        lead="Lo que conviene saber antes de publicar una compra."
        faqs={faqs}
      />
      <FinalCta
        ctaHref={ctaHref}
        ctaLabel={tenders.ctaLabel}
        title="¿Tenés insumos para comprar?"
        description="Registrá tus proveedores y publicá tu primera licitación."
      />
    </main>
  );
}
