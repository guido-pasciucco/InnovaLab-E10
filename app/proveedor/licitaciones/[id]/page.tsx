import { notFound } from "next/navigation";

import { formatDateTime, formatMoney, formatQuantity } from "@/components/tenders/format";
import { OfferForm } from "@/components/tenders/offer-form";
import { PhaseBadge, roundLabel } from "@/components/tenders/phase-badge";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireSupplier } from "@/lib/auth/require-supplier";
import { AppError } from "@/lib/errors/app-error";
import { getSupplierTenderService, type SupplierTenderView } from "@/lib/services/tenders";

type SupplierTenderPageProps = { params: Promise<{ id: string }> };

async function loadTender(
  userId: Parameters<typeof getSupplierTenderService>[0],
  id: string,
): Promise<SupplierTenderView> {
  try {
    return await getSupplierTenderService(userId, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "TENDER_NOT_FOUND") notFound();
    throw err;
  }
}

// One tender, supplier side (RN-06): only the terms and its own offer. No
// other supplier, no position, no catalog reference price (RN-07).
export default async function SupplierTenderPage({ params }: SupplierTenderPageProps) {
  const { user } = await requireSupplier();
  const { id } = await params;
  const tender = await loadTender(user.id, id);

  return (
    <PageShell
      eyebrow={tender.ownerName}
      title={`Licitación N° ${tender.number}`}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <PhaseBadge phase={tender.phase} />
          {roundLabel(tender.currentRound, tender.roundCount)}
        </span>
      }
      links={[{ href: "/proveedor", label: "Volver al panel" }]}
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
        </dl>
        <p className="text-sm text-fg-muted">
          Los precios son finales, puestos en destino (con impuestos y flete), por unidad. Tu primera oferta no puede
          superar el precio de partida, y en cada ronda podés bajar tu precio o mantenerlo. El precio objetivo es una
          referencia: no estás obligado a alcanzarlo.
        </p>
      </Card>

      <Card title="Insumos" id="insumos">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-fg-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Insumo</th>
                <th scope="col" className="py-2 pr-4 font-medium">Cantidad</th>
                <th scope="col" className="py-2 pr-4 font-medium">Precio de partida</th>
                <th scope="col" className="py-2 font-medium">Precio objetivo vigente</th>
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
                  <td className="py-2 font-semibold text-brand-green-700">
                    {item.currentTarget ? formatMoney(item.currentTarget) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {tender.phase === "active" && tender.currentRound && (
        <Card title={`Tu oferta · ronda ${tender.currentRound} de ${tender.roundCount}`} id="oferta">
          <OfferForm tenderId={tender.id} round={tender.currentRound} items={tender.items} />
        </Card>
      )}

      <Card title="Tus ofertas" id="historial">
        {tender.items.every((item) => item.myOffers.length === 0) ? (
          <p className="text-sm text-fg-muted">Todavía no ofertaste en esta licitación.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {tender.items
              .filter((item) => item.myOffers.length > 0)
              .map((item) => (
                <li key={item.id}>
                  <p className="font-semibold text-fg">{item.supplyName}</p>
                  <ul className="text-fg-muted">
                    {item.myOffers.map((offer, index) => (
                      <li key={index}>
                        Ronda {offer.round}: {formatMoney(offer.unitPrice)} · {formatDateTime(offer.createdAt)}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </PageShell>
  );
}
