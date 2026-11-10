import type { PresentationVariableCost, VariableCostsSuccess } from "@/lib/calc/calculateVariableCosts";
import { formatARS } from "@/lib/money/format";

type VariableCostsSummaryProps = {
  productName: string;
  costs: VariableCostsSuccess;
  supplyNames?: Readonly<Record<string, string>>;
};

function money(value: string): string {
  return formatARS(value) || "$ 0,00";
}

function exactMoney(value: string): string {
  const [integer, fraction] = value.split(".");
  const grouped = (integer ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$ ${grouped}${fraction === undefined ? ",00" : `,${fraction}`}`;
}

function presentationLabel(presentation: PresentationVariableCost): string {
  return `${presentation.name}: ${money(presentation.totalCost)}`;
}

/**
 * Presentational-only view for the product catalogue. It accepts the result of
 * calculateVariableCosts directly, so amounts shown here never reimplement
 * the cost formula. Product persistence and the catalogue integration remain
 * intentionally outside this component.
 */
export function VariableCostsSummary({
  productName,
  costs,
  supplyNames = {},
}: VariableCostsSummaryProps) {
  return (
    <section
      aria-labelledby="variable-costs-heading"
      className="rounded-[24px] border border-border-default bg-surface p-5 shadow-sm"
    >
      <div>
        <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">Costos variables</p>
        <h2 id="variable-costs-heading" className="mt-1 text-xl font-semibold text-fg">
          {productName}
        </h2>
      </div>

      <div className="mt-5 rounded-[16px] bg-surface-tint p-4">
        <p className="text-sm font-semibold text-fg">Costo de elaborar una unidad</p>
        <p className="mt-2 text-2xl font-bold text-fg">{money(costs.unitCost)}</p>
        <p className="mt-2 text-sm text-fg-muted">
          Ingredientes de la receta: {money(costs.ingredientsCost)} ÷ rendimiento: {costs.recipeYield} unidades.
        </p>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-fg">Costo de vender una presentación</h3>
        {costs.presentations.length === 0 ? (
          <p className="mt-2 text-sm text-fg-muted">Todavía no cargaste presentaciones comerciales.</p>
        ) : (
          <ul className="mt-3 space-y-2" aria-label="Costos por presentación">
            {costs.presentations.map((presentation) => (
              <li
                key={presentation.id}
                className="flex items-center justify-between gap-4 rounded-[14px] border border-border-default px-4 py-3"
              >
                <span className="font-medium text-fg">{presentation.name}</span>
                <span aria-label={presentationLabel(presentation)} className="font-semibold text-fg">
                  {money(presentation.totalCost)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="mt-5 rounded-[16px] border border-border-control">
        <summary className="cursor-pointer rounded-[16px] px-4 py-3 text-sm font-semibold text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          ¿Cómo se calculó?
        </summary>
        <div className="border-t border-border-default px-4 py-4 text-sm text-fg">
          <dl className="grid gap-2">
            <div className="flex justify-between gap-4">
              <dt>Costo de la receta</dt>
              <dd className="font-semibold">{money(costs.ingredientsCost)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Rendimiento</dt>
              <dd className="font-semibold">{costs.recipeYield} unidades</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Costo exacto usado por unidad</dt>
              <dd className="font-semibold">{exactMoney(costs.unitCostExact)}</dd>
            </div>
          </dl>

          {costs.presentations.map((presentation) => (
            <article key={presentation.id} className="mt-5 border-t border-border-default pt-4">
              <h4 className="font-semibold text-fg">{presentation.name}</h4>
              <dl className="mt-2 grid gap-2">
                <div className="flex justify-between gap-4">
                  <dt>{presentation.unitsPerPresentation} unidades elaboradas</dt>
                  <dd>{money(presentation.productCost)}</dd>
                </div>
                {presentation.packaging.length === 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt>Packaging</dt>
                    <dd>Sin packaging adicional</dd>
                  </div>
                ) : (
                  presentation.packaging.map((packaging, index) => (
                    <div key={`${presentation.id}-${packaging.supplyId}-${index}`} className="flex justify-between gap-4">
                      <dt>
                        {supplyNames[packaging.supplyId] ?? packaging.supplyId}: {packaging.quantity} {packaging.unit}
                      </dt>
                      <dd>{money(packaging.cost)}</dd>
                    </div>
                  ))
                )}
                <div className="flex justify-between gap-4 border-t border-border-default pt-2 font-semibold">
                  <dt>Costo variable final</dt>
                  <dd>{money(presentation.totalCost)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
