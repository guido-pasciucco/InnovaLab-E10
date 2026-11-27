import Link from "next/link";

import { orderTotals } from "@/lib/calc/purchaseOrder";
import { latestOffers, offerKey } from "@/lib/calc/tenderOffers";
import type { TenderDetail } from "@/lib/services/tenders";
import { Card } from "@/components/ui/page-shell";
import { formatDateTime, formatMoney, formatQuantity } from "./format";
import { AwardItemForm, NegotiationForm, PurchaseOrderForm, ThankYouNoteButton } from "./purchase-forms";

const linkClass = "font-semibold text-brand-green-700 underline";

// After the close (RN-14 to RN-16, RN-21): who the emprendedor buys each item
// from, the negotiation requests, one purchase order per chosen supplier and
// the thank-you note for the others. The app never chooses (RN-14).
export function PurchasePanel({ tender, defaultContact }: { tender: TenderDetail; defaultContact: string }) {
  const latest = latestOffers(tender.offers);
  const awardByItem = new Map(tender.awards.map((award) => [award.itemId, award]));
  const orderBySupplier = new Map(tender.orders.map((order) => [order.supplierUserId, order]));
  const offeredItems = tender.items.filter((item) =>
    tender.suppliers.some((supplier) => latest.has(offerKey(supplier.supplierUserId, item.id))),
  );

  return (
    <>
      <Card title="¿A quién le comprás cada insumo?" id="eleccion">
        <p className="text-sm text-fg-muted">
          Las ofertas son de referencia y no obligan a nadie. Podés repartir la compra eligiendo un proveedor distinto
          para cada insumo.
        </p>
        <ul className="divide-y divide-border-default">
          {offeredItems.map((item) => {
            const award = awardByItem.get(item.id) ?? null;
            const order = award ? orderBySupplier.get(award.supplierUserId) : undefined;
            const candidates = tender.suppliers.flatMap((supplier) => {
              const offer = latest.get(offerKey(supplier.supplierUserId, item.id));
              return offer
                ? [{ supplierUserId: supplier.supplierUserId, businessName: supplier.businessName, unitPrice: offer.unitPrice }]
                : [];
            });
            const chosen = award && tender.suppliers.find((supplier) => supplier.supplierUserId === award.supplierUserId);
            return (
              <li key={item.id} className="space-y-2 py-3">
                <p className="text-sm font-semibold text-fg">
                  {item.supplyName} · {formatQuantity(item.quantity)} {item.unit}
                </p>
                {award && chosen && (
                  <p className="text-sm text-fg">
                    Elegiste a <strong>{chosen.businessName}</strong> a {formatMoney(award.unitPrice)} por {item.unit}.
                  </p>
                )}
                {order ? (
                  <p className="text-sm text-fg-muted">Está en la orden de compra N° {order.number}: ya no se puede cambiar.</p>
                ) : (
                  <AwardItemForm
                    tenderId={tender.id}
                    itemId={item.id}
                    unit={item.unit}
                    candidates={candidates}
                    current={award ? { supplierUserId: award.supplierUserId, unitPrice: award.unitPrice } : null}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Compra por proveedor" id="compra">
        <ul className="divide-y divide-border-default">
          {tender.suppliers.map((supplier) => {
            const awarded = tender.items.flatMap((item) => {
              const award = awardByItem.get(item.id);
              return award?.supplierUserId === supplier.supplierUserId ? [{ item, unitPrice: award.unitPrice }] : [];
            });
            const offered = tender.items.some((item) => latest.has(offerKey(supplier.supplierUserId, item.id)));
            const order = orderBySupplier.get(supplier.supplierUserId);
            const estimate =
              awarded.length > 0
                ? orderTotals(awarded.map((line) => ({ quantity: line.item.quantity, unitPrice: line.unitPrice }))).total
                : null;
            return (
              <li key={supplier.supplierUserId} className="space-y-3 py-4">
                <div>
                  <p className="font-semibold text-fg">{supplier.businessName}</p>
                  <p className="text-sm text-fg-muted">
                    {supplier.contactName} · {supplier.phone} · {supplier.email}
                  </p>
                </div>
                {awarded.length > 0 ? (
                  <p className="text-sm text-fg">
                    {awarded.map((line) => line.item.supplyName).join(", ")} · total {formatMoney(estimate!)}
                  </p>
                ) : (
                  <p className="text-sm text-fg-muted">
                    {offered ? "Todavía no lo elegiste para ningún insumo." : "No ofertó en esta licitación."}
                  </p>
                )}
                {offered &&
                  (supplier.negotiationRequestedAt ? (
                    <p className="text-sm text-fg-muted">
                      Pediste negociar el {formatDateTime(supplier.negotiationRequestedAt)}. Le compartiste:{" "}
                      {supplier.negotiationContact}
                    </p>
                  ) : (
                    <NegotiationForm tenderId={tender.id} supplierUserId={supplier.supplierUserId} defaultContact={defaultContact} />
                  ))}
                {order ? (
                  <p className="text-sm">
                    <Link href={`/licitaciones/${tender.id}/ordenes/${order.id}`} className={linkClass}>
                      Ver orden de compra N° {order.number}
                    </Link>{" "}
                    <span className="text-fg-muted">· {formatMoney(order.total)}</span>
                  </p>
                ) : (
                  awarded.length > 0 && <PurchaseOrderForm tenderId={tender.id} supplierUserId={supplier.supplierUserId} />
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Nota de agradecimiento" id="nota">
        {tender.thankYouNoteAt ? (
          <p className="text-sm text-fg">
            La mostraste el {formatDateTime(tender.thankYouNoteAt)}. La ven en su panel los proveedores que no elegiste.
          </p>
        ) : (
          <>
            <p className="text-sm text-fg-muted">
              Si querés, los proveedores que no elegiste ven en su panel la misma nota de agradecimiento, sin precios ni
              resultados.
            </p>
            <ThankYouNoteButton tenderId={tender.id} />
          </>
        )}
      </Card>
    </>
  );
}
