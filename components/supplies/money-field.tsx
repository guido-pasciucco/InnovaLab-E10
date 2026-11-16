"use client";

import { useState, type ReactNode } from "react";
import { useController, type Control } from "react-hook-form";

import type { Supply } from "@/lib/schemas/supplies/supplies";
import {
  formatMoneyInput,
  formatMoneyTyping,
  parseMoneyInput,
} from "@/lib/schemas/supplies/input-format";
import { TextField } from "@/components/ui/text-field";

type MoneyFieldProps = {
  control: Control<Supply>;
  disabled?: boolean;
  error?: string;
  help?: ReactNode;
};

// Controlled money input: the form state stores the canonical decimal string
// ("20000.50"), while the input shows the user-facing format ("20.000,50").
export function MoneyField({ control, disabled, error, help }: MoneyFieldProps) {
  const { field } = useController({ control, name: "purchasePrice" });
  const [display, setDisplay] = useState(() => formatMoneyInput(field.value));

  return (
    <TextField
      label="Precio de compra"
      placeholder="20.000,00"
      inputMode="decimal"
      autoComplete="off"
      disabled={disabled}
      error={error}
      help={help}
      value={display}
      onChange={(event) => {
        const next = formatMoneyTyping(event.currentTarget.value);
        setDisplay(next);
        field.onChange(parseMoneyInput(next));
      }}
      onBlur={() => {
        field.onBlur();
        setDisplay(formatMoneyInput(parseMoneyInput(display)));
      }}
    />
  );
}
