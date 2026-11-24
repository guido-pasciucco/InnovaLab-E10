import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDate, formatMoney, formatQuantity } from "@/components/tenders/format";
import { PrintButton } from "@/components/tenders/print-button";
import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import { formatCuit } from "@/lib/schemas/suppliers/cuit";
import { getPurchaseOrderService, type PurchaseOrderView } from "@/lib/services/tender-purchases";

type OrderPageProps = { params: Promise<{ id: string; orderId: string }> };

async function loadOrder(userId: Parameters<typeof getPurchaseOrderService>[0], id: string): Promise<PurchaseOrderView> {
  try {
    return await getPurchaseOrderService(userId, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "TENDER_NOT_FOUND") notFound();
    throw err;
  }
}

// Printable purchase order (RN-15): items, quantities, unit price, total,
// delivery and payment terms, date and correlative number. The emprendedor
// prints it or saves it as PDF and sends it by their own means.
export default async function PurchaseOrderPage({ params }: OrderPageProps) {
  const user = await requireUser();
  const { orderId } = await params;
  const order = await loadOrder(user.id, orderId);

  return (
    <main className="min-h-screen bg-surface-tint px-4 py-10 print:bg-white print:p-0 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/licitaciones/${order.tenderId}`} className="text-sm font-semibold text-brand-green-700 underline">
            Volver a la licitación
          </Link>
          <PrintButton />
        </div>

        <article className="space-y-6 rounded-3xl bg-surface p-6 shadow-sm print:rounded-none print:shadow-none sm:p-8">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-fg">Orden de compra N° {order.number}</h1>
              <p className="text-sm text-fg-muted">Licitación N° {order.tenderNumber}</p>
            </div>
            <p className="text-sm text-fg">Fecha: {formatDate(order.issuedAt)}</p>
          </header>

          <section className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <h2 className="font-semibold text-fg-muted">Comprador</h2>
              <p className="text-fg">{order.ownerName}</p>
            </div>
            <div>
              <h2 className="font-semibold text-fg-muted">Proveedor</h2>
              <p className="text-fg">{order.supplier.businessName}</p>
              <p className="text-fg">CUIT {formatCuit(order.supplier.cuit)}</p>
              <p className="text-fg">
                {order.supplier.contactName} · {order.supplier.phone} · {order.supplier.email}
              </p>
            </div>
          </section>

          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-default text-fg-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Ítem</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Cantidad</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Precio unitario</th>
                <th scope="col" className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {order.lines.map((line, index) => (
                <tr key={index}>
                  <td className="py-2 pr-4 text-fg">{line.supplyName}</td>
                  <td className="py-2 pr-4 text-right text-fg">
                    {formatQuantity(line.quantity)} {line.unit}
                  </td>
                  <td className="py-2 pr-4 text-right text-fg">{formatMoney(line.unitPrice)}</td>
                  <td className="py-2 text-right text-fg">{formatMoney(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-default">
                <td colSpan={3} className="py-2 pr-4 text-right font-semibold text-fg">
                  Total
                </td>
                <td className="py-2 text-right font-bold text-fg">{formatMoney(order.total)}</td>
              </tr>
            </tfoot>
          </table>

          <section className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <h2 className="font-semibold text-fg-muted">Condiciones de entrega</h2>
              <p className="whitespace-pre-line text-fg">{order.deliveryTerms}</p>
            </div>
            <div>
              <h2 className="font-semibold text-fg-muted">Condiciones de pago</h2>
              <p className="whitespace-pre-line text-fg">{order.paymentTerms}</p>
            </div>
          </section>

          <p className="text-xs text-fg-muted">
            Precios finales puestos en destino, con impuestos y flete incluidos, por unidad de medida.
          </p>
        </article>
      </div>
    </main>
  );
}
