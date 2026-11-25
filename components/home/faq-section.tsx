import { PlusIcon } from "./icons";
import { container, eyebrow, sectionLead, sectionTitle } from "./styles";

export type FaqItem = {
  question: string;
  answer: string;
};

type FaqSectionProps = {
  faqs: readonly FaqItem[];
  title: string;
  lead?: string;
  /** All marketing pages expose the same anchor for the dropdown links. */
  id?: string;
};

export function FaqSection({
  faqs,
  title,
  lead = "Las dudas que aparecen antes de empezar.",
  id = "preguntas",
}: FaqSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby="faq-title"
      className="scroll-mt-36 border-t border-border-default bg-surface py-16 sm:py-20"
    >
      <div className={container}>
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className={eyebrow}>Preguntas frecuentes</p>
            <h2 id="faq-title" className={sectionTitle}>
              {title}
            </h2>
            <p className={sectionLead}>{lead}</p>
          </div>

          <div className="mt-10 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-border-default bg-surface-tint open:bg-surface open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-sm font-semibold text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
                  <span>{faq.question}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-action-tonal text-link transition-transform group-open:rotate-45">
                    <PlusIcon className="h-4 w-4" />
                  </span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-6 text-fg-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
