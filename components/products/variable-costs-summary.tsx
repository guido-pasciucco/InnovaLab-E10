import { useId } from "react";
import Decimal from "decimal.js";

import type { PresentationVariableCost, VariableCostsSuccess } from "@/lib/calc/calculateVariableCosts";
import { formatARS } from "@/lib/money/format";

type VariableCostsSummaryProps = {
  productName: string;
  costs: VariableCostsSuccess;
  supplyNames?: Readonly<Record<string, string>>;
};

function money(value: string): string {
  return formatARS(value) || "Importe no disponible";
}

function calculationValue(value: string): string {
  if (/^-?\d+\/\d+$/.test(value)) return value;

  let fixed: string;
  let decimal: Decimal;
  try {
    decimal = new Decimal(value);
    if (!decimal.isFinite()) return "Valor no disponible";
    const decimals = Math.min(Math.max(decimal.decimalPlaces(), 2), 8);
    fixed = decimal.toFixed(decimals);
  } catch {
    return "Valor no disponible";
  }

  const [integer = "0", fraction = ""] = fixed.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const displayedFraction = fraction.padEnd(2, "0");
  const suffix = decimal.decimalPlaces() > 8 ? "…" : "";
  return `$ ${grouped},${displayedFraction}${suffix}`;
}

function unitLabel(quantity: string): string {
  return `${quantity} ${quantity === "1" ? "unidad" : "unidades"}`;
}

function madeUnitLabel(quantity: string): string {
  return `${unitLabel(quantity)} ${quantity === "1" ? "elaborada" : "elaboradas"}`;
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
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-[24px] border border-border-default bg-surface p-5 shadow-sm"
    >
      <div>
        <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">Costos variables</p>
        <h2 id={headingId} className="mt-1 break-words text-xl font-semibold text-fg">
          {productName}
        </h2>
      </div>

      <div className="mt-5 rounded-[16px] bg-surface-tint p-4">
        <p className="text-sm font-semibold text-fg">Costo de elaborar una unidad</p>
        <p className="mt-2 text-2xl font-bold text-fg">{money(costs.unitCost)}</p>
        <p className="mt-2 text-sm text-fg-muted">
          Ingredientes de la receta: {money(costs.ingredientsCost)} ÷ rendimiento: {unitLabel(costs.recipeYield)}.
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
                className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-border-default px-4 py-3 sm:flex-nowrap sm:gap-4"
              >
                <span className="min-w-0 break-words font-medium text-fg">{presentation.name}</span>
                <span aria-label={presentationLabel(presentation)} className="shrink-0 font-semibold text-fg">
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
              <dd className="font-semibold">{unitLabel(costs.recipeYield)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Relación exacta usada por unidad</dt>
              <dd className="font-semibold">{calculationValue(costs.unitCostCalculationValue)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-fg-muted">
            Esta relación no es un importe de cobro: el motor la usa sin aproximaciones para calcular cada presentación.
          </p>

          {costs.presentations.map((presentation) => (
            <article key={presentation.id} className="mt-5 min-w-0 border-t border-border-default pt-4">
              <h4 className="font-semibold text-fg">{presentation.name}</h4>
              <dl className="mt-2 grid gap-2">
                <div className="flex flex-wrap justify-between gap-2 sm:flex-nowrap sm:gap-4">
                  <dt className="min-w-0 break-words">{madeUnitLabel(presentation.unitsPerPresentation)}</dt>
                  <dd className="shrink-0">{money(presentation.productCost)}</dd>
                </div>
                {presentation.packaging.length === 0 ? (
                  <div className="flex flex-wrap justify-between gap-2 sm:flex-nowrap sm:gap-4">
                    <dt>Packaging</dt>
                    <dd>Sin packaging adicional</dd>
                  </div>
                ) : (
                  presentation.packaging.map((packaging, index) => (
                    <div key={`${presentation.id}-${packaging.supplyId}-${index}`} className="flex flex-wrap justify-between gap-2 sm:flex-nowrap sm:gap-4">
                      <dt className="min-w-0 break-words">
                        {supplyNames[packaging.supplyId] ?? "Insumo de packaging"}: {packaging.quantity} {packaging.unit}
                      </dt>
                      <dd className="shrink-0">{money(packaging.cost)}</dd>
                    </div>
                  ))
                )}
                {presentation.packaging.length > 0 && (
                  <>
                    <div className="flex flex-wrap justify-between gap-2 border-t border-border-default pt-2 sm:flex-nowrap sm:gap-4">
                      <dt>Subtotal de packaging</dt>
                      <dd className="shrink-0">{money(presentation.packagingCost)}</dd>
                    </div>
                    {presentation.packagingItemsAdjustment !== "0.00" && (
                      <div className="flex flex-wrap justify-between gap-2 sm:flex-nowrap sm:gap-4">
                        <dt>Ajuste de redondeo del packaging</dt>
                        <dd className="shrink-0">{money(presentation.packagingItemsAdjustment)}</dd>
                      </div>
                    )}
                  </>
                )}
                {presentation.roundingAdjustment !== "0.00" && (
                  <div className="flex flex-wrap justify-between gap-2 sm:flex-nowrap sm:gap-4">
                    <dt>Ajuste de redondeo de la presentación</dt>
                    <dd className="shrink-0">{money(presentation.roundingAdjustment)}</dd>
                  </div>
                )}
                <div className="flex flex-wrap justify-between gap-2 border-t border-border-default pt-2 font-semibold sm:flex-nowrap sm:gap-4">
                  <dt>Costo variable final</dt>
                  <dd className="shrink-0">{money(presentation.totalCost)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
