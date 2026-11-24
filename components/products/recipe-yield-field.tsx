"use client";

import { useId, type ChangeEvent } from "react";

import { TextField } from "@/components/ui/text-field";

export type RecipeYieldFieldProps = {
  productName?: string | null;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  id?: string;
};

export function recipeYieldLabel(productName?: string | null): string {
  const normalizedName = productName?.trim().replace(/\s+/g, " ");

  return normalizedName
    ? `¿Cuántas unidades de ${normalizedName} obtenés con esta receta?`
    : "¿Cuántas unidades obtenés con esta receta?";
}

/**
 * Controlled field for the finished units produced by a recipe. The parent
 * owns validation timing, so incomplete values remain editable until submit.
 * #288: it keeps its own "Rendimiento" heading so the yield is never confused
 * with the monthly capacity (a different, optional product field).
 */
export function RecipeYieldField({
  productName,
  value,
  onChange,
  error,
  disabled = false,
  id,
}: RecipeYieldFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helpId = `${inputId}-help`;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <section className="space-y-3 rounded-[16px] border border-border-default bg-surface-tint p-4">
      <p className="text-xs font-bold tracking-[0.12em] text-brand-green-700 uppercase">
        Rendimiento
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <TextField
            id={inputId}
            label={recipeYieldLabel(productName)}
            value={value}
            onChange={handleChange}
            error={error}
            disabled={disabled}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="1"
            aria-describedby={helpId}
          />
        </div>
        <p id={helpId} className="text-sm text-fg-muted sm:w-56 sm:pt-8">
          Indicá cuántos productos terminados obtenés usando las cantidades de esta receta.
        </p>
      </div>
    </section>
  );
}
