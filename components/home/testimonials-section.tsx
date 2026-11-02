import { StarIcon } from "./icons";
import { container, eyebrow, sectionLead, sectionTitle } from "./styles";

type Testimonial = {
  quote: string;
  name: string;
  business: string;
  initials: string;
  avatarClass: string;
};

const testimonials: readonly Testimonial[] = [
  {
    quote:
      "Me ayudó a entender que estaba vendiendo por debajo de mi costo real. Ahora sé exactamente cuánto necesito vender para vivir de mi emprendimiento.",
    name: "Lucía Fernández",
    business: "Indumentaria",
    initials: "LF",
    avatarClass: "bg-[#DFF3E8] text-[#0B6B4F]",
  },
  {
    quote:
      "Antes calculaba todo en una planilla que nunca terminaba de entender. Con la calculadora supe en minutos cuál era mi precio real.",
    name: "Martín Ríos",
    business: "Panadería",
    initials: "MR",
    avatarClass: "bg-[#FDF0D8] text-[#8A5B12]",
  },
  {
    quote:
      "Lo que más me sirvió fue el punto de equilibrio. Dejé de vender a ciegas y empecé a tomar decisiones con datos.",
    name: "Carolina Benítez",
    business: "Cerámica",
    initials: "CB",
    avatarClass: "bg-[#E7E9FB] text-[#3D478C]",
  },
];

export function TestimonialsSection() {
  return (
    <section
      id="testimonios"
      aria-labelledby="testimonials-title"
      className="scroll-mt-36 py-16 sm:py-20"
    >
      <div className={container}>
        <div className="mx-auto max-w-3xl text-center">
          <p className={eyebrow}>Testimonios · Ejemplo ilustrativo</p>
          <h2 id="testimonials-title" className={sectionTitle}>
            Pensado para <span className="text-[#0B6B4F]">emprendedores</span> como vos
          </h2>
          <p className={sectionLead}>
            Así imaginamos que decidirían con datos quienes dejen de poner precios a ojo. Estos
            testimonios son de ejemplo y se reemplazarán por opiniones reales.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="flex flex-col rounded-2xl border border-[#E0EEE6] bg-white p-6 shadow-sm"
            >
              <div className="flex gap-0.5 text-[#D99A00]" aria-label="5 de 5 estrellas">
                {Array.from({ length: 5 }, (_, index) => (
                  <StarIcon key={index} className="h-4 w-4" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-7 text-[#486055]">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-[#E4EEE8] pt-5">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${testimonial.avatarClass}`}
                  aria-hidden="true"
                >
                  {testimonial.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#122B22]">{testimonial.name}</p>
                  <p className="mt-0.5 text-xs text-[#6C8077]">{testimonial.business}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
