import type { ComponentType } from "react";

import { ChartIcon, TargetIcon, TrendingUpIcon, type IconProps } from "./icons";
import { container, eyebrow, sectionLead, sectionTitle } from "./styles";

type ScenarioTone = "neutral" | "warning" | "positive";

type Scenario = {
  name: string;
  badge: string;
  tone: ScenarioTone;
  icon: ComponentType<IconProps>;
  rows: readonly { label: string; value: string }[];
  note: string;
};

const scenarios: readonly Scenario[] = [
  {
    name: "Cálculo estándar",
    badge: "Actual",
    tone: "neutral",
    icon: ChartIcon,
    rows: [
      { label: "Precio de venta", value: "$24.900" },
      { label: "Costo unitario", value: "$21.065" },
      { label: "Margen neto", value: "15,4%" },
      { label: "Margen de contribución (30 u.)", value: "$115.050" },
    ],
    note: "Tu punto de partida, con los datos que ya cargaste.",
  },
  {
    name: "Aumento del 10% en costos",
    badge: "−8,5 pts",
    tone: "warning",
    icon: TrendingUpIcon,
    rows: [
      { label: "Precio de venta", value: "$24.900" },
      { label: "Costo unitario", value: "$23.172" },
      { label: "Margen neto", value: "6,9%" },
      { label: "Margen de contribución (30 u.)", value: "$51.840" },
    ],
    note: "Mismo precio, menos margen: reaccioná antes de que lo notes en la caja.",
  },
  {
    name: "Precio de lista y margen",
    badge: "Recomendado",
    tone: "positive",
    icon: TargetIcon,
    rows: [
      { label: "Precio de venta", value: "$26.900" },
      { label: "Costo unitario", value: "$21.065" },
      { label: "Margen neto", value: "21,7%" },
      { label: "Margen de contribución (30 u.)", value: "$175.050" },
    ],
    note: "Más margen sin tocar tus costos. Compará el impacto antes de decidir.",
  },
];

const scenarioStyles: Record<
  ScenarioTone,
  { icon: string; badge: string; note: string; card: string }
> = {
  neutral: {
    icon: "bg-action-tonal text-link",
    badge: "bg-surface-tint text-fg-muted",
    note: "bg-surface-tint text-fg-muted",
    card: "border-border-default bg-surface shadow-sm",
  },
  warning: {
    icon: "bg-danger-subtle text-danger",
    badge: "bg-danger-subtle text-danger",
    note: "bg-danger-subtle text-danger",
    card: "border-danger/25 bg-surface shadow-sm",
  },
  positive: {
    icon: "bg-action-tonal text-link",
    badge: "bg-action-tonal text-link",
    note: "bg-action-tonal text-link",
    card: "border-action-primary bg-surface shadow-xl shadow-action-primary/10 lg:-translate-y-1",
  },
};

export function ScenariosSection() {
  return (
    <section
      id="escenarios"
      aria-labelledby="scenarios-title"
      className="scroll-mt-36 border-y border-border-default bg-surface py-16 sm:py-20"
    >
      <div className={container}>
        <div className="mx-auto max-w-3xl text-center">
          <p className={eyebrow}>Comparador de escenarios</p>
          <h2 id="scenarios-title" className={sectionTitle}>
            Compará 3 escenarios sin modificar tus datos originales
          </h2>
          <p className={sectionLead}>
            Probá distintos precios y costos, y mirá el impacto en tu rentabilidad antes de decidir.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {scenarios.map((scenario) => {
            const styles = scenarioStyles[scenario.tone];

            return (
              <article
                key={scenario.name}
                className={`relative flex flex-col rounded-2xl border p-6 ${styles.card}`}
              >
                {scenario.tone === "positive" ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-action-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-on-action-primary">
                    Recomendado
                  </span>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles.icon}`}
                  >
                    <scenario.icon className="h-5 w-5" />
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}
                  >
                    {scenario.badge}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-fg">
                  {scenario.name}
                </h3>

                <dl className="mt-5 flex-1 space-y-3 border-t border-border-default pt-4">
                  {scenario.rows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4">
                      <dt className="text-xs text-fg-muted">{row.label}</dt>
                      <dd className="text-sm font-semibold text-fg">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <p className={`mt-5 rounded-xl px-3 py-2.5 text-xs leading-5 ${styles.note}`}>
                  {scenario.note}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
