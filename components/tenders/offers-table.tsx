import { latestOffers, offerKey, type OfferRecord } from "@/lib/calc/tenderOffers";
import { formatDateTime, formatMoney, formatQuantity } from "./format";

type Item = { id: string; supplyName: string; unit: string; quantity: string; startingPrice: string };
type Invitation = { id: string; businessName: string };

// Live offers per item for the emprendedor (RN-08: every offer with the
// supplier's identity, from the start). A supplier that did not quote an
// item shows "Sin oferta" (RN-20).
export function OffersTable({ items, invitations, offers }: { items: Item[]; invitations: Invitation[]; offers: OfferRecord[] }) {
  const latest = latestOffers(offers);

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <div key={item.id} className="space-y-2">
          <h3 className="text-base font-semibold text-fg">
            {item.supplyName} · {formatQuantity(item.quantity)} {item.unit} · partida {formatMoney(item.startingPrice)}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-fg-muted">
                <tr>
                  <th scope="col" className="py-1 pr-4 font-medium">Proveedor</th>
                  <th scope="col" className="py-1 pr-4 font-medium">Última oferta</th>
                  <th scope="col" className="py-1 pr-4 font-medium">Ronda</th>
                  <th scope="col" className="py-1 font-medium">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {invitations.map((invitation) => {
                  const offer = latest.get(offerKey(invitation.id, item.id));
                  return (
                    <tr key={invitation.id}>
                      <td className="py-1 pr-4 text-fg">{invitation.businessName}</td>
                      <td className="py-1 pr-4 font-semibold text-fg">{offer ? formatMoney(offer.unitPrice) : "Sin oferta"}</td>
                      <td className="py-1 pr-4 text-fg-muted">{offer ? offer.round : "—"}</td>
                      <td className="py-1 text-fg-muted">{offer ? formatDateTime(offer.createdAt) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
