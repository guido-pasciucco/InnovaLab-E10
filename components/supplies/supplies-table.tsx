"use client";

import { useTransition } from "react";

import { deleteSupply } from "@/app/supplies/actions";
import { calculateMinimumUnitPrice } from "@/lib/calc/supplyCost";
import type { SupplyKind } from "@/lib/schemas/supplies/fields";
import type { SupplyItem } from "@/lib/schemas/supplies/supplies";
import { moneyFormat, quantityFormat, unitPriceFormat } from "./format";

type SuppliesTableProps = {
  supplies: SupplyItem[];
  kind: SupplyKind;
  onEdit: (supply: SupplyItem) => void;
  searchActive?: boolean;
};

export function SuppliesTable({
  supplies,
  kind,
  onEdit,
  searchActive = false,
}: SuppliesTableProps) {
  const [isPending, startTransition] = useTransition();
  const noun = kind === "packaging" ? "packaging" : "insumo";

  const handleDelete = (id: string) => {
    if (!confirm("¿Borrar este ítem?")) return;
    startTransition(() => {
      void deleteSupply(undefined, { id });
    });
  };

  if (supplies.length === 0) {
    return (
      <div className="rounded-[24px] bg-surface p-8 text-center shadow-sm">
        {searchActive ? (
          <>
            <p className="text-fg-muted">No encontramos ítems con esa búsqueda.</p>
            <p className="mt-1 text-sm text-fg-muted">Probá con otra palabra.</p>
          </>
        ) : (
          <>
            <p className="text-fg-muted">Todavía no cargaste ningún {noun}.</p>
            <p className="mt-1 text-sm text-fg-muted">
              Tocá &ldquo;+ Nuevo&rdquo; para empezar tu catálogo.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[24px] bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-control">
            <th scope="col" className="min-w-48 px-3 py-3 font-semibold text-fg-muted">
              Nombre
            </th>
            <th scope="col" className="px-3 py-3 whitespace-nowrap font-semibold text-fg-muted">
              Compra
            </th>
            <th scope="col" className="px-3 py-3 whitespace-nowrap font-semibold text-fg-muted">
              Precio
            </th>
            <th scope="col" className="px-3 py-3 whitespace-nowrap font-semibold text-fg-muted">
              Unidad mínima
            </th>
            <th scope="col" className="px-3 py-3 whitespace-nowrap font-semibold text-fg-muted">
              Costo/unidad
            </th>
            <th
              scope="col"
              className="px-3 py-3 whitespace-nowrap text-right font-semibold text-fg-muted"
            >
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {supplies.map((supply) => {
            const unitPrice = calculateMinimumUnitPrice(
              supply.purchasePrice,
              supply.purchaseQuantity,
              supply.conversionFactor,
            );

            return (
              <tr key={supply.id} className="border-b border-border-control last:border-0">
                <td className="min-w-48 px-3 py-3 text-fg">{supply.name}</td>
                <td className="px-3 py-3 whitespace-nowrap text-fg">
                  {quantityFormat.format(Number(supply.purchaseQuantity))}{" "}
                  {supply.purchaseUnit}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-fg">
                  {moneyFormat.format(Number(supply.purchasePrice))}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-fg">{supply.minimumUnit}</td>
                <td className="px-3 py-3 whitespace-nowrap text-fg">
                  {unitPrice ? unitPriceFormat.format(Number(unitPrice)) : "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right">
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(supply)}
                      disabled={isPending}
                      aria-label={`Editar ${supply.name}`}
                      className="min-h-9 rounded-[10px] border border-border-control px-2 py-1 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(supply.id)}
                      disabled={isPending}
                      aria-label={`Borrar ${supply.name}`}
                      className="min-h-9 rounded-[10px] border border-border-control px-2 py-1 text-sm font-semibold text-danger hover:bg-danger/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                    >
                      Borrar
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
