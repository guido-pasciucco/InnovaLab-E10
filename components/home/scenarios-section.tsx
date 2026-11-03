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

// Example figures follow the app formulas: fixed costs $180.000 per month,
// variable cost $18.000 per unit, unit cost = fixed / volume + variable and
// estimated profit = (price - variable) x volume - fixed.
const scenarios: readonly Scenario[] = [
  {
    name: "Base",
    badge: "Tus datos",
    tone: "neutral",
    icon: ChartIcon,
    rows: [
      { label: "Precio", value: "$30.000" },
      { label: "Volumen", value: "60 u." },
      { label: "Margen real", value: "30%" },
      { label: "Ganancia estimada", value: "$540.000" },
      { label: "Unidades de equilibrio", value: "15" },
    ],
    note: "Tu punto de partida, con los datos que cargaste. Nunca se modifica.",
  },
  {
    name: "Precio más bajo",
    badge: "−7,8 pts",
    tone: "warning",
    icon: TrendingUpIcon,
    rows: [
      { label: "Precio", value: "$27.000" },
      { label: "Volumen", value: "60 u." },
      { label: "Margen real", value: "22,2%" },
      { label: "Ganancia estimada", value: "$360.000" },
      { label: "Unidades de equilibrio", value: "20" },
    ],
    note: "Bajar el precio achica tu margen y te exige más ventas para cubrir tus costos.",
  },
  {
    name: "Más volumen",
    badge: "+2,5 pts",
    tone: "positive",
    icon: TargetIcon,
    rows: [
      { label: "Precio", value: "$30.000" },
      { label: "Volumen", value: "80 u." },
      { label: "Margen real", value: "32,5%" },
      { label: "Ganancia estimada", value: "$780.000" },
      { label: "Unidades de equilibrio", value: "15" },
    ],
    note: "Vender más reparte tus costos fijos entre más unidades y mejora tu margen.",
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
            Compará hasta 3 escenarios sin modificar tus datos originales
          </h2>
          <p className={sectionLead}>
            Duplicá tu escenario base, cambiá el precio o el volumen y compará margen, ganancia y punto de equilibrio antes de decidir.
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

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-6 text-fg-muted">
          Además, podés simular un aumento de tus costos variables por inflación y ver cómo afecta
          tu margen, sin guardar cambios.
        </p>
      </div>
    </section>
  );
}
