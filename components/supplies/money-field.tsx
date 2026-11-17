"use client";

import { useEffect, useRef, type ReactNode } from "react";
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

// Keeps the caret after the same significant characters it had before
// formatting. Typing at the end is the common case and is handled by the
// caller, which puts the caret at the end of the formatted value.
function caretAfterFormatting(raw: string, formatted: string, caret: number): number {
  const before = raw.slice(0, caret);
  const digits = before.replace(/\D/g, "").length;
  const hasDecimal = before.includes(",");
  const target = digits + (hasDecimal ? 1 : 0);

  if (target === 0) return 0;

  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    const character = formatted[index];
    if (/\d/.test(character) || character === ",") {
      seen += 1;
      if (seen >= target) return index + 1;
    }
  }

  return formatted.length;
}

// Money input: the form state stores the canonical decimal string
// ("20000.50"), while the input shows the Argentine format ("20.000,50").
// The input is uncontrolled because formatting it through React state on every
// keystroke can race with fast typing; setting the DOM value in the same
// onChange keeps the next key reading the formatted value.
export function MoneyField({ control, disabled, error, help }: MoneyFieldProps) {
  const { field } = useController({ control, name: "purchasePrice" });
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync only when the form value changes from outside the input (edit/reset).
  // During typing, onChange already leaves the DOM and the field in sync.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const canonical = field.value ?? "";
    if (parseMoneyInput(input.value) === canonical) return;

    input.value = formatMoneyInput(canonical);
  }, [field.value]);

  return (
    <TextField
      ref={(node) => {
        inputRef.current = node;
        field.ref(node);
      }}
      label="Precio de compra"
      placeholder="20.000,00"
      inputMode="decimal"
      autoComplete="off"
      disabled={disabled}
      error={error}
      help={help}
      defaultValue={formatMoneyInput(field.value ?? "")}
      onChange={(event) => {
        const input = event.currentTarget;
        const raw = input.value;
        const caret = input.selectionStart ?? raw.length;
        const formatted = formatMoneyTyping(raw);
        const canonical = parseMoneyInput(formatted);

        input.value = formatted;
        const nextCaret =
          caret === raw.length
            ? formatted.length
            : caretAfterFormatting(raw, formatted, caret);
        input.setSelectionRange(nextCaret, nextCaret);

        field.onChange(canonical);
      }}
      onBlur={(event) => {
        field.onBlur();

        const input = event.currentTarget;
        const canonical = parseMoneyInput(input.value);
        input.value = formatMoneyInput(canonical);

        if (canonical !== field.value) {
          field.onChange(canonical);
        }
      }}
    />
  );
}
