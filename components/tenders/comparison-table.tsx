import type { ComparisonItem, PriceDifference } from "@/lib/calc/tenderResults";
import { formatMoney, formatQuantity } from "./format";

type Item = {
  id: string;
  supplyName: string;
  unit: string;
  quantity: string;
  startingPrice: string;
  referencePrice: string | null;
};
type Supplier = { supplierUserId: string; businessName: string };

function Difference({ value }: { value: PriceDifference | null }) {
  if (!value) return <span className="text-fg-muted">—</span>;
  const cheaper = value.amount.startsWith("-");
  const sign = cheaper ? "-" : value.amount === "0.00" ? "" : "+";
  const amount = cheaper ? value.amount.slice(1) : value.amount;
  const percent = cheaper ? value.percent.slice(1) : value.percent;
  return (
    <span className={cheaper ? "text-success" : "text-fg"}>
      {sign}
      {formatMoney(amount)} ({sign}
      {percent.replace(".", ",")} %)
    </span>
  );
}

// RN-13: per item, each supplier's last offer and its difference against the
// starting price and the catalog price at publish. Void items (RN-19) and
// suppliers that did not quote (RN-20) are marked as such.
export function ComparisonTable({
  items,
  suppliers,
  comparison,
}: {
  items: Item[];
  suppliers: Supplier[];
  comparison: ComparisonItem[];
}) {
  const nameOf = new Map(suppliers.map((supplier) => [supplier.supplierUserId, supplier.businessName]));

  return (
    <div className="space-y-6">
      {comparison.map((row) => {
        const item = items.find((i) => i.id === row.itemId)!;
        return (
          <div key={row.itemId} className="space-y-2">
            <h3 className="text-base font-semibold text-fg">
              {item.supplyName} · {formatQuantity(item.quantity)} {item.unit}
              {row.isVoid && (
                <span className="ml-2 rounded-full bg-danger-subtle px-2 py-0.5 text-xs font-semibold text-danger">
                  Desierto
                </span>
              )}
            </h3>
            <p className="text-sm text-fg-muted">
              Precio de partida {formatMoney(item.startingPrice)}
              {item.referencePrice && ` · tu catálogo al publicar ${formatMoney(item.referencePrice)}`}
            </p>
            {row.isVoid ? (
              <p className="text-sm text-fg">Nadie ofertó por este insumo. Podés publicar una licitación nueva para él.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-fg-muted">
                    <tr>
                      <th scope="col" className="py-1 pr-4 font-medium">Proveedor</th>
                      <th scope="col" className="py-1 pr-4 font-medium">Última oferta</th>
                      <th scope="col" className="py-1 pr-4 font-medium">Contra el precio de partida</th>
                      <th scope="col" className="py-1 font-medium">Contra tu catálogo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {row.rows.map((offer) => (
                      <tr key={offer.supplierUserId}>
                        <td className="py-1 pr-4 text-fg">{nameOf.get(offer.supplierUserId)}</td>
                        <td className={`py-1 pr-4 ${offer.unitPrice === row.best ? "font-bold text-brand-green-700" : "text-fg"}`}>
                          {offer.unitPrice ? formatMoney(offer.unitPrice) : "Sin oferta"}
                        </td>
                        <td className="py-1 pr-4">
                          <Difference value={offer.vsStarting} />
                        </td>
                        <td className="py-1">
                          <Difference value={offer.vsReference} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
