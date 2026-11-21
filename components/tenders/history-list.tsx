import type { TenderHistoryEvent } from "@/lib/services/tender-purchases";
import { formatDateTime, formatMoney, formatPercent } from "./format";

function describe(event: TenderHistoryEvent): string {
  switch (event.kind) {
    case "published":
      return `Publicada: ${event.roundCount} rondas de ${event.roundHours} horas, ${formatPercent(event.decrementPercent)} de baja por ronda.`;
    case "round":
      return `Empezó la ronda ${event.round}.`;
    case "offer":
      return `${event.supplier} ofertó ${formatMoney(event.unitPrice)} por ${event.item} (ronda ${event.round}).`;
    case "warning_ack":
      return "Elegiste dejar que siga después del aviso de insumos sin ofertas.";
    case "cancelled":
      return "Cancelaste la licitación.";
    case "closed":
      return "Cerró la licitación.";
    case "award":
      return `Elegiste a ${event.supplier} para ${event.item} a ${formatMoney(event.unitPrice)}.`;
    case "negotiation":
      return `Pediste negociar con ${event.supplier}.`;
    case "order":
      return `Generaste la orden de compra N° ${event.number} para ${event.supplier} por ${formatMoney(event.total)}.`;
    case "thank_you":
      return "Mostraste la nota de agradecimiento a los proveedores no elegidos.";
  }
}

// RN-17: the whole process, oldest first, with date and time.
export function HistoryList({ events }: { events: TenderHistoryEvent[] }) {
  return (
    <ol className="space-y-1 text-sm">
      {events.map((event, index) => (
        <li key={index} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
          <span className="shrink-0 text-fg-muted tabular-nums">{formatDateTime(event.at)}</span>
          <span className="text-fg">{describe(event)}</span>
        </li>
      ))}
    </ol>
  );
}
