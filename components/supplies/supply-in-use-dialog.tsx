"use client";import { Button } from "@/components/ui/button";


import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteSupply } from "@/app/(business)/supplies/actions";
import { removeSupplyFromProduct } from "@/app/(business)/products/actions";
import { removePackagingFromPresentation } from "@/app/(business)/products/[id]/presentations/actions";
import { CatalogModal } from "@/components/ui/catalog-modal";
import {
  isSupplyUsageDetails,
  type SupplyUsage,
} from "@/lib/schemas/supplies/supply-usage";

type SupplyInUseDialogProps = {
  supplyId: string;
  supplyName: string;
  kind: "supply" | "packaging";
  details: unknown;
  onClose: () => void;
};

export function SupplyInUseDialog({
  supplyId,
  supplyName,
  kind,
  details,
  onClose,
}: SupplyInUseDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [usages, setUsages] = useState<SupplyUsage[]>(
    isSupplyUsageDetails(details) ? details.usages : [],
  );
  const [error, setError] = useState<string | null>(null);
  const noun = kind === "packaging" ? "packaging" : "insumo";

  const handleRemove = (usage: SupplyUsage) => {
    setError(null);
    startTransition(async () => {
      const result =
        usage.kind === "recipe"
          ? await removeSupplyFromProduct(undefined, {
              productId: usage.productId,
              supplyId,
            })
          : await removePackagingFromPresentation(undefined, {
              productId: usage.productId,
              presentationId: usage.presentationId,
              supplyId,
            });

      if (!result.ok) {
        setError(result.message);
        return;
      }
      setUsages((current) =>
        current.filter((item) =>
          usage.kind === "recipe"
            ? !(item.kind === "recipe" && item.productId === usage.productId)
            : !(
                item.kind === "presentation" &&
                item.presentationId === usage.presentationId
              ),
        ),
      );
      router.refresh();
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteSupply(undefined, { id: supplyId });
      if (result.ok) {
        router.refresh();
        onClose();
        return;
      }
      if (result.code === "SUPPLY_IN_USE" && isSupplyUsageDetails(result.details)) {
        setUsages(result.details.usages);
        setError("Todavía queda algún uso. Revisá la lista de abajo.");
        return;
      }
      setError(result.message);
    });
  };

  return (
    <CatalogModal
      size="lg"
      title={`No se puede borrar ${supplyName}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-[16px] bg-surface-tint px-4 py-3 text-sm text-fg-muted">
          {kind === "packaging"
            ? `Este packaging todavía se usa en una o más presentaciones. Si lo borrás, esas presentaciones se quedan sin empaque y su costo queda incompleto.`
            : `Este insumo todavía se usa en una o más recetas. Si lo borrás, esas recetas se quedan sin precio y el costo de esos productos deja de ser válido.`}
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}

        {usages.length === 0 ? (
          <p className="text-sm text-fg">
            Ya no queda ningún uso. Ahora podés borrar {noun}{" "}
            <span className="font-semibold">{supplyName}</span>.
          </p>
        ) : (
          <ul className="space-y-3">
            {usages.map((usage) => {
              const key =
                usage.kind === "recipe"
                  ? `recipe:${usage.productId}`
                  : `presentation:${usage.presentationId}`;
              const isOnlyIngredient =
                usage.kind === "recipe" && usage.ingredientCount === 1;
              const isInactive = !usage.isActive;

              return (
                <li
                  key={key}
                  className="flex flex-col gap-2 rounded-[16px] border border-border-control p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 text-sm">
                    {usage.kind === "recipe" ? (
                      <>
                        <p className="font-semibold text-fg">{usage.productName}</p>
                        <p className="mt-0.5 text-fg-muted">
                          Receta con {usage.ingredientCount}{" "}
                          {usage.ingredientCount === 1 ? "insumo" : "insumos"}. Al
                          sacarlo, el costo de {usage.productName} se recalcula.
                        </p>
                        {isOnlyIngredient && (
                          <p className="mt-1 font-medium text-danger">
                            Es el único insumo de esta receta: agregá otro antes de
                            sacarlo, o borrá el producto.
                          </p>
                        )}
                        {isInactive && (
                          <p className="mt-1 font-medium text-danger">
                            Este producto está dado de baja y no se puede editar
                            desde acá.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-fg">
                          {usage.presentationName}
                        </p>
                        <p className="mt-0.5 text-fg-muted">
                          Presentación de {usage.productName}. Al sacarlo, esa
                          presentación se calcula solo con la receta, sin este
                          empaque.
                        </p>
                        {isInactive && (
                          <p className="mt-1 font-medium text-danger">
                            Este producto está dado de baja y no se puede editar
                            desde acá.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <Button variant="outline" size="sm"
                    type="button"
                    onClick={() => handleRemove(usage)}
                    disabled={isPending || isOnlyIngredient || isInactive}
                    className="min-h-9! shrink-0! rounded-[10px]! border! border-border-control! px-3! py-1! text-sm! font-semibold! text-brand-green-700! hover:bg-brand-green-50! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:opacity-50!"
                  >
                    {usage.kind === "recipe"
                      ? `Quitar de ${usage.productName}`
                      : `Quitar de ${usage.presentationName}`}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-end gap-2 border-t border-border-control pt-4">
          <Button variant="ghost" size="md"
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="min-h-11! rounded-[14px]! border! border-border-control! px-4! py-2! text-sm! font-semibold! text-fg! hover:bg-surface-tint! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:opacity-50!"
          >
            Cancelar
          </Button>
          <Button variant="danger" size="md"
            type="button"
            onClick={handleDelete}
            disabled={isPending || usages.length > 0}
            title={
              usages.length > 0
                ? "Primero quitá el insumo de todos los lugares donde se usa"
                : undefined
            }
            className="min-h-11! rounded-[14px]! bg-danger! px-4! py-2! text-sm! font-semibold! text-white! hover:bg-danger/90! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:opacity-50!"
          >
            Borrar {noun}
          </Button>
        </div>
      </div>
    </CatalogModal>
  );
}
