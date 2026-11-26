import Link from "next/link";
import { notFound } from "next/navigation";

import { CancelTenderForm } from "@/components/tenders/cancel-tender-form";
import { ComparisonTable } from "@/components/tenders/comparison-table";
import { NoOfferWarning } from "@/components/tenders/no-offer-warning";
import { HistoryList } from "@/components/tenders/history-list";
import { OffersTable } from "@/components/tenders/offers-table";
import { PurchasePanel } from "@/components/tenders/purchase-panel";
import { formatDateTime, formatMoney, formatPercent, formatQuantity } from "@/components/tenders/format";
import { PhaseBadge, roundLabel } from "@/components/tenders/phase-badge";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import { formatCuit } from "@/lib/schemas/suppliers/cuit";
import { getTenderHistoryService } from "@/lib/services/tender-purchases";
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

// One tender, emprendedor side: terms, target price per round, live offers
// with identity (RN-08), the round-1 warning (RN-18), and after the close the
// comparative table, the purchase (RN-13 to RN-16, RN-21) and the history
// (RN-17).
export default async function TenderPage({ params }: TenderPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const tender = await loadTender(user.id, id);
  const history = await getTenderHistoryService(user.id, tender.id);

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
      {tender.noOfferWarning && (
        <NoOfferWarning
          tenderId={tender.id}
          items={tender.items.filter((item) => tender.noOfferWarning!.itemIds.includes(item.id)).map((item) => item.supplyName)}
        />
      )}

      {tender.comparison && (
        <Card title="Cuadro comparativo" id="comparativo">
          {tender.isVoid ? (
            <p className="text-sm text-fg">
              La licitación cerró sin ofertas y quedó desierta. Queda guardada en el historial y podés{" "}
              <Link href="/licitaciones/nueva" className="font-semibold text-brand-green-700 underline">
                publicar una nueva
              </Link>
              .
            </p>
          ) : (
            <ComparisonTable items={tender.items} suppliers={tender.suppliers} comparison={tender.comparison} />
          )}
        </Card>
      )}

      {tender.comparison && !tender.isVoid && <PurchasePanel tender={tender} defaultContact={user.email ?? ""} />}

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

      {!tender.comparison && (
        <Card title="Ofertas" id="ofertas">
          <p className="text-sm text-fg-muted">
            La última oferta de cada proveedor por insumo. Los proveedores no ven estas ofertas ni saben cuántos
            compiten.
          </p>
          <OffersTable items={tender.items} suppliers={tender.suppliers} offers={tender.offers} />
        </Card>
      )}

      <Card title={`Proveedores que ofertaron (${tender.suppliers.length})`} id="proveedores">
        {tender.suppliers.length === 0 ? (
          <p className="text-sm text-fg-muted">Todavía no ofertó ningún proveedor.</p>
        ) : (
          <ul className="divide-y divide-border-default">
            {tender.suppliers.map((supplier) => (
              <li key={supplier.supplierUserId} className="py-2 text-sm">
                <p className="font-semibold text-fg">{supplier.businessName}</p>
                <p className="text-fg-muted">
                  CUIT {formatCuit(supplier.cuit)} · {supplier.contactName} · {supplier.phone} · {supplier.email}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Historial" id="historial">
        <HistoryList events={history} />
      </Card>
    </PageShell>
  );
}
