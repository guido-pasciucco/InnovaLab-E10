"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

// How long "¡Copiado!" stays before the label comes back.
const FEEDBACK_MS = 2000;

const LABELS: Record<CopyState, string> = {
  idle: "Copiar resumen",
  copied: "¡Copiado!",
  failed: "No pudimos copiar",
};

// "Copiar resumen": the text is built on the server (buildSummaryText), so the
// clipboard carries the same figures the screen shows.
export function SummaryCopyButton({ text, className }: { text: string; className: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // No clipboard access (an insecure origin or a denied permission).
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), FEEDBACK_MS);
  }

  return (
    <button type="button" onClick={copy} className={className}>
      <span aria-live="polite">{LABELS[state]}</span>
    </button>
  );
}
