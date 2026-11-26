"use client";

import { useState, useTransition } from "react";

import { deleteSupply } from "@/app/(business)/supplies/actions";
import { Button } from "@/components/ui/button";
import { calculateMinimumUnitPrice } from "@/lib/calc/supplyCost";
import { getSupplyUnitBasis } from "@/lib/schemas/supplies/units";
import type { SupplyKind } from "@/lib/schemas/supplies/fields";
import type { SupplyItem } from "@/lib/schemas/supplies/supplies";
import { moneyFormat, quantityFormat, unitPriceFormat } from "./format";
import { SupplyInUseDialog } from "./supply-in-use-dialog";

type InUseDialogState = {
  supplyId: string;
  supplyName: string;
  details: unknown;
};

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
  const [error, setError] = useState<string | null>(null);
  const [inUse, setInUse] = useState<InUseDialogState | null>(null);
  const noun = kind === "packaging" ? "packaging" : "insumo";

  const handleDelete = (supply: SupplyItem) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteSupply(undefined, { id: supply.id });

      if (result.ok) return;
      if (result.code === "SUPPLY_IN_USE") {
        setInUse({
          supplyId: supply.id,
          supplyName: supply.name,
          details: result.details,
        });
        return;
      }
      setError(result.message);
    });
  };

  if (supplies.length === 0) {
    return (
      <div className="rounded-2xl bg-surface p-6 text-center shadow-sm">
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
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-[16px] bg-danger-subtle px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      <div className="max-w-full overflow-x-auto rounded-2xl border border-border-default bg-surface shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-border-control">
            <th scope="col" className="min-w-40 px-3 py-2.5 text-xs font-semibold tracking-wide text-fg-muted uppercase">
              Nombre
            </th>
            <th scope="col" className="px-3 py-2.5 whitespace-nowrap text-xs font-semibold tracking-wide text-fg-muted uppercase">
              Compra
            </th>
            <th scope="col" className="px-3 py-2.5 whitespace-nowrap text-xs font-semibold tracking-wide text-fg-muted uppercase">
              Precio
            </th>
            <th scope="col" className="px-3 py-2.5 whitespace-nowrap text-xs font-semibold tracking-wide text-fg-muted uppercase">
              Unidad mínima
            </th>
            <th scope="col" className="px-3 py-2.5 whitespace-nowrap text-xs font-semibold tracking-wide text-fg-muted uppercase">
              Costo por unidad mínima
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 whitespace-nowrap text-right text-xs font-semibold tracking-wide text-fg-muted uppercase"
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
              supply.purchaseUnit,
            );

            return (
              <tr key={supply.id} className="border-b border-border-default transition-colors last:border-0 hover:bg-surface-tint/70">
                <td className="min-w-40 px-3 py-2.5 font-medium text-fg">{supply.name}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-fg">
                  {quantityFormat.format(Number(supply.purchaseQuantity))}{" "}
                  {supply.purchaseUnit}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-fg">
                  {moneyFormat.format(Number(supply.purchasePrice))}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-fg">
                  {getSupplyUnitBasis(supply.purchaseUnit)?.minimumUnit ?? "—"}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap font-medium text-fg">
                  {unitPrice ? unitPriceFormat.format(Number(unitPrice)) : "—"}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-right">
                  <div className="inline-flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(supply)}
                      disabled={isPending}
                      aria-label={`Editar ${supply.name}`}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(supply)}
                      disabled={isPending}
                      aria-label={`Borrar ${supply.name}`}
                    >
                      Borrar
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>

      {inUse && (
        <SupplyInUseDialog
          supplyId={inUse.supplyId}
          supplyName={inUse.supplyName}
          kind={kind}
          details={inUse.details}
          onClose={() => setInUse(null)}
        />
      )}
    </div>
  );
}
