import { notFound } from "next/navigation";

import { CancelTenderForm } from "@/components/tenders/cancel-tender-form";
import { formatDateTime, formatMoney, formatPercent, formatQuantity } from "@/components/tenders/format";
import { PhaseBadge, roundLabel } from "@/components/tenders/phase-badge";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import { formatCuit } from "@/lib/schemas/suppliers/cuit";
import { getTenderDetailService, type TenderDetail } from "@/lib/services/tenders";

type TenderPageProps = { params: Promise<{ id: string }> };

async function loadTender(userId: Parameters<typeof getTenderDetailService>[0], id: string): Promise<TenderDetail> {
  try {
    return await getTenderDetailService(userId, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "TENDER_NOT_FOUND") notFound();
    throw err;
  }
}

// One tender, emprendedor side: terms, target price per round, invited
// suppliers with their identity (RN-08) and the cancel action (RN-03).
export default async function TenderPage({ params }: TenderPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const tender = await loadTender(user.id, id);

  return (
    <PageShell
      eyebrow="Licitaciones"
      title={`Licitación N° ${tender.number}`}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <PhaseBadge phase={tender.phase} />
          {roundLabel(tender.currentRound, tender.roundCount)}
        </span>
      }
      links={[{ href: "/licitaciones", label: "Volver a licitaciones" }]}
    >
      <Card title="Términos" id="terminos">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-fg-muted">Inicio</dt>
            <dd className="font-semibold text-fg">{formatDateTime(tender.startsAt)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Cierre</dt>
            <dd className="font-semibold text-fg">{formatDateTime(tender.endsAt)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Rondas</dt>
            <dd className="font-semibold text-fg">
              {tender.roundCount} rondas de {tender.roundHours} horas
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">Baja del precio objetivo por ronda</dt>
            <dd className="font-semibold text-fg">{formatPercent(tender.decrementPercent)}</dd>
          </div>
          {tender.cancelledAt && (
            <div>
              <dt className="text-fg-muted">Cancelada</dt>
              <dd className="font-semibold text-danger">{formatDateTime(tender.cancelledAt)}</dd>
            </div>
          )}
        </dl>
        {tender.phase === "active" && <CancelTenderForm tenderId={tender.id} />}
      </Card>

      <Card title="Insumos" id="insumos">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-fg-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Insumo</th>
                <th scope="col" className="py-2 pr-4 font-medium">Cantidad</th>
                <th scope="col" className="py-2 pr-4 font-medium">Precio de partida</th>
                <th scope="col" className="py-2 font-medium">Precio objetivo por ronda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {tender.items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="py-2 pr-4 text-fg">
                    <span className="font-semibold">{item.supplyName}</span>
                    {item.specs && <span className="block text-fg-muted">{item.specs}</span>}
                  </td>
                  <td className="py-2 pr-4 text-fg">
                    {formatQuantity(item.quantity)} {item.unit}
                  </td>
                  <td className="py-2 pr-4 text-fg">{formatMoney(item.startingPrice)}</td>
                  <td className="py-2 text-fg">
                    {item.targets.map((target, index) => (
                      <span
                        key={index}
                        className={index + 1 === tender.currentRound ? "font-bold text-brand-green-700" : "text-fg-muted"}
                      >
                        {index > 0 && " → "}
                        {formatMoney(target)}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`Proveedores invitados (${tender.invitations.length})`} id="invitados">
        <ul className="divide-y divide-border-default">
          {tender.invitations.map((invitation) => (
            <li key={invitation.id} className="py-2 text-sm">
              <p className="font-semibold text-fg">{invitation.businessName}</p>
              <p className="text-fg-muted">
                CUIT {formatCuit(invitation.cuit)} · {invitation.contactName} · {invitation.phone} · {invitation.email}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </PageShell>
  );
}
