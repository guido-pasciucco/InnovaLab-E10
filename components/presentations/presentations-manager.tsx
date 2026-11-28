"use client";

import { useCallback, useState, useTransition } from "react";

import { deletePresentation } from "@/app/(business)/products/[id]/presentations/actions";
import type {
  PackagingOption,
  PresentationItem,
  ProductPresentationsView,
} from "@/lib/schemas/presentations/presentations";
import { VariableCostsSummary } from "@/components/products/variable-costs-summary";
import { Button } from "@/components/ui/button";
import { CatalogModal } from "@/components/ui/catalog-modal";
import { describeCostState } from "./cost-state";
import { PresentationForm } from "./presentation-form";

type PresentationsManagerProps = {
  view: ProductPresentationsView;
  packaging: PackagingOption[];
};

function packagingSummary(presentation: PresentationItem): string {
  if (presentation.packaging.length === 0) return "Sin packaging";
  return presentation.packaging
    .map((line) => `${line.supplyName} (${line.quantity} ${line.unit})`)
    .join(", ");
}

// P12 client side (#298): the cost summary plus the editable list. The server
// action revalidates this route, so the view always comes from the server and
// the client only keeps which modal is open.
export function PresentationsManager({ view, packaging }: PresentationsManagerProps) {
  const { product, presentations } = view;
  const [editing, setEditing] = useState<PresentationItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const costState = describeCostState(product);
  const supplyNames = Object.fromEntries(
    presentations.flatMap((presentation) =>
      presentation.packaging.map((line) => [line.supplyId, line.supplyName]),
    ),
  );
  const unpricedNames = [...new Set(
    view.packagingWithoutPrice.map((id) => supplyNames[id] ?? "Packaging"),
  )];

  const openForm = (presentation: PresentationItem | null) => {
    setEditing(presentation);
    setShowForm(true);
    setStatus(null);
    setError(null);
  };

  const closeForm = () => {
    setEditing(null);
    setShowForm(false);
  };

  const handleSaved = useCallback(() => {
    setStatus(editing ? "Presentación actualizada." : "Presentación guardada.");
    setEditing(null);
    setShowForm(false);
  }, [editing]);

  const handleDelete = (presentation: PresentationItem) => {
    if (!confirm(`¿Quitar la presentación «${presentation.name}»?`)) return;

    setStatus(null);
    setError(null);
    startDelete(async () => {
      const result = await deletePresentation(undefined, {
        id: presentation.id,
        productId: product.id,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setStatus(`«${presentation.name}» se quitó.`);
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-[16px] bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="rounded-[16px] bg-success-subtle px-4 py-3 text-sm font-medium text-success">
          {status}
        </p>
      )}

      {costState.kind !== "ready" ? (
        <p role="status" className="rounded-[16px] bg-warning-subtle px-4 py-3 text-sm text-fg">
          {costState.message}
        </p>
      ) : (
        product.variableCosts && (
          <>
            {unpricedNames.length > 0 && (
              <p role="status" className="rounded-[16px] bg-warning-subtle px-4 py-3 text-sm text-fg">
                Packaging sin precio: {unpricedNames.join(", ")}. Cargale el precio en
                Insumos y packaging; mientras tanto, el costo de las presentaciones que
                lo usan no está completo.
              </p>
            )}
            <VariableCostsSummary
              productName={product.name}
              costs={product.variableCosts}
              supplyNames={supplyNames}
            />
          </>
        )
      )}

      <section aria-label="Presentaciones" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-fg">
            Presentaciones ({presentations.length})
          </h2>
          <Button variant="primary" size="md"
            type="button"
            onClick={() => openForm(null)}
            disabled={isDeleting}
            className="min-h-11! shrink-0! rounded-[14px]! bg-action-primary! px-5! py-2! text-sm! font-semibold! text-on-action-primary! hover:bg-action-primary-hover! active:bg-action-primary-pressed! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:cursor-not-allowed! disabled:opacity-50!"
          >
            + Nueva
          </Button>
        </div>

        {presentations.length === 0 ? (
          <div className="rounded-[24px] bg-surface p-8 text-center shadow-sm">
            <p className="text-fg-muted">Todavía no cargaste presentaciones.</p>
            <p className="mt-1 text-sm text-fg-muted">
              Tocá &ldquo;+ Nueva&rdquo; para armar, por ejemplo, la unidad o una caja x6.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[24px] bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-control">
                  <th scope="col" className="min-w-40 px-3 py-3 font-semibold text-fg-muted">
                    Nombre
                  </th>
                  <th scope="col" className="px-3 py-3 whitespace-nowrap font-semibold text-fg-muted">
                    Unidades
                  </th>
                  <th scope="col" className="min-w-48 px-3 py-3 font-semibold text-fg-muted">
                    Packaging
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold text-fg-muted">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {presentations.map((presentation) => (
                  <tr key={presentation.id} className="border-b border-border-control last:border-0">
                    <td className="px-3 py-3 text-fg">{presentation.name}</td>
                    <td className="px-3 py-3 text-fg-muted">{presentation.unitsPerPresentation}</td>
                    <td className="px-3 py-3 text-fg-muted">{packagingSummary(presentation)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openForm(presentation)}
                          disabled={isDeleting}
                          aria-label={`Editar ${presentation.name}`}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(presentation)}
                          disabled={isDeleting}
                          aria-label={`Quitar ${presentation.name}`}
                        >
                          Quitar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <CatalogModal
          title={`${editing ? "Editar" : "Nueva"} presentación`}
          onClose={closeForm}
          size="lg"
        >
          <PresentationForm
            productId={product.id}
            presentation={editing}
            packaging={packaging}
            onCancel={closeForm}
            onSaved={handleSaved}
          />
        </CatalogModal>
      )}
    </div>
  );
}
