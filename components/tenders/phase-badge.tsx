import type { TenderPhase } from "@/lib/calc/tenderRounds";

const LABEL: Record<TenderPhase, string> = {
  active: "En curso",
  closed: "Cerrada",
  cancelled: "Cancelada",
};

const TONE: Record<TenderPhase, string> = {
  active: "bg-success-subtle text-success",
  closed: "bg-surface-tint text-fg",
  cancelled: "bg-danger-subtle text-danger",
};

export function PhaseBadge({ phase }: { phase: TenderPhase }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${TONE[phase]}`}>{LABEL[phase]}</span>
  );
}

// "Ronda 2 de 4" while active; the phase otherwise.
export function roundLabel(currentRound: number | null, roundCount: number): string {
  return currentRound ? `Ronda ${currentRound} de ${roundCount}` : "";
}
