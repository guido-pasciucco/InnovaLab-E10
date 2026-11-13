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
    <section className="rounded-[16px] border border-border-default bg-surface-tint p-4">
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
      <p id={helpId} className="mt-2 text-sm text-fg-muted">
        Indicá cuántos productos terminados obtenés usando las cantidades de esta receta.
      </p>
    </section>
  );
}
