"use client";

import { useTransition } from "react";

import { deleteSupply } from "@/app/supplies/actions";
import type { SupplyItem } from "@/lib/schemas/supplies/supplies";

type SuppliesTableProps = {
  supplies: SupplyItem[];
  onEdit: (supply: SupplyItem) => void;
};

const moneyFormat = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function SuppliesTable({ supplies, onEdit }: SuppliesTableProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (!confirm("¿Borrar este insumo?")) return;
    startTransition(() => {
      void deleteSupply(undefined, { id });
    });
  };

  if (supplies.length === 0) {
    return (
      <div className="rounded-[24px] bg-surface p-8 text-center shadow-sm">
        <p className="text-fg-muted">Todavía no cargaste ningún insumo.</p>
        <p className="mt-1 text-sm text-fg-muted">
          Tocá &ldquo;+ Nuevo&rdquo; para empezar tu catálogo.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[24px] bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-control">
            <th scope="col" className="px-5 py-3 font-semibold text-fg-muted">
              Insumo
            </th>
            <th scope="col" className="px-5 py-3 font-semibold text-fg-muted">
              Precio de compra
            </th>
            <th scope="col" className="px-5 py-3 text-right font-semibold text-fg-muted">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {supplies.map((supply) => (
            <tr key={supply.id} className="border-b border-border-control last:border-0">
              <td className="px-5 py-3 text-fg">{supply.name}</td>
              <td className="px-5 py-3 text-fg">
                {moneyFormat.format(Number(supply.purchasePrice))}
              </td>
              <td className="px-5 py-3 text-right">
                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(supply)}
                    disabled={isPending}
                    className="min-h-9 rounded-[10px] border border-border-control px-3 py-1 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(supply.id)}
                    disabled={isPending}
                    className="min-h-9 rounded-[10px] border border-border-control px-3 py-1 text-sm font-semibold text-danger hover:bg-danger/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                  >
                    Borrar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
