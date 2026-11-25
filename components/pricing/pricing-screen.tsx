"use client";import { Button } from "@/components/ui/button";


import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useForm } from "react-hook-form";

import { saveDefaultMarkup, saveProductMarkup } from "@/app/(business)/precios/actions";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import type { ServiceResult } from "@/lib/errors/catalog";
import {
  markupFormSchema,
  type MarkupFormInput,
  type MarkupFormValues,
} from "@/lib/schemas/pricing/pricing";
import {
  formatMarkup,
  formatMarkupInput,
  NOT_AVAILABLE,
  type PricingRowView,
  type PricingView,
} from "./pricing-values";

const FIELD_NAMES = ["markupPercent"] as const;
const NOT_AVAILABLE_CLASS = "text-fg-muted";

const linkClass =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] px-5 py-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const secondaryButtonClass =
  "min-h-9! rounded-[10px]! border! border-border-control! bg-surface! px-3! text-xs! font-semibold! text-fg! hover:bg-surface-tint! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:cursor-not-allowed! disabled:opacity-50!";

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-border-control bg-surface px-3 py-2 text-sm text-fg placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-fg-disabled";

type SavedState = ServiceResult<PricingView> | undefined;

function Figure({ value, emphasis = false }: { value: string; emphasis?: boolean }) {
  const missing = value === NOT_AVAILABLE;

  return (
    <span className={missing ? NOT_AVAILABLE_CLASS : emphasis ? "font-bold text-fg" : "text-fg"}>
      {value}
    </span>
  );
}

function DefaultMarkupForm({
  value,
  onSaved,
}: {
  value: string | null;
  onSaved: (view: PricingView) => void;
}) {
  const [state, submitAction, isPending] = useActionState(saveDefaultMarkup, undefined);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<MarkupFormInput, unknown, MarkupFormValues>({
    resolver: zodResolver(markupFormSchema),
    defaultValues: { markupPercent: formatMarkupInput(value) },
  });
  const hasServerFieldErrors = useServerFieldErrors(state, setError, FIELD_NAMES);
  const handled = useRef<SavedState>(undefined);

  useEffect(() => {
    if (!state?.ok || handled.current === state) return;
    handled.current = state;
    onSaved(state.data);
    setValue("markupPercent", formatMarkupInput(state.data.defaultMarkupPercent));
  }, [state, onSaved, setValue]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit((data) => {
      dispatchInTransition(submitAction)({ defaultMarkupPercent: data.markupPercent });
    })(event);
  };

  const field = register("markupPercent");

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="max-w-xs flex-1">
        <TextField
          label="Recargo por defecto del negocio"
          placeholder="30,00"
          inputMode="decimal"
          autoComplete="off"
          disabled={isPending}
          error={errors.markupPercent?.message}
          {...field}
        />
      </div>
      <PrimaryButton type="submit" disabled={isPending} className="sm:w-auto">
        {isPending ? "Guardando…" : "Guardar recargo por defecto"}
      </PrimaryButton>
      {state && !state.ok && !hasServerFieldErrors && (
        <p role="alert" className="rounded-[16px] bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

function MarkupRowForm({
  row,
  defaultMarkup,
  onSaved,
}: {
  row: PricingRowView;
  defaultMarkup: string | null;
  onSaved: (view: PricingView) => void;
}) {
  const [state, submitAction, isPending] = useActionState(saveProductMarkup, undefined);
  const [isClearing, startClear] = useTransition();
  const [clearError, setClearError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<MarkupFormInput, unknown, MarkupFormValues>({
    resolver: zodResolver(markupFormSchema),
    defaultValues: { markupPercent: row.markupInput },
  });
  useServerFieldErrors(state, setError, FIELD_NAMES);
  const handled = useRef<SavedState>(undefined);

  useEffect(() => {
    if (!state?.ok || handled.current === state) return;
    handled.current = state;
    onSaved(state.data);
    const saved = state.data.rows.find((item) => item.id === row.id);
    setValue("markupPercent", saved?.markupInput ?? "");
  }, [state, onSaved, row.id, setValue]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit((data) => {
      dispatchInTransition(submitAction)({
        productId: row.productId,
        presentationId: row.presentationId,
        markupPercent: data.markupPercent,
      });
    })(event);
  };

  const clear = () => {
    setClearError(null);
    startClear(async () => {
      const result = await saveProductMarkup(undefined, {
        productId: row.productId,
        presentationId: row.presentationId,
        markupPercent: null,
      });
      if (!result.ok) {
        setClearError(result.message);
        return;
      }
      onSaved(result.data);
      setValue("markupPercent", "");
    });
  };

  const field = register("markupPercent");
  const busy = isPending || isClearing;
  const errorMessage = errors.markupPercent?.message ?? clearError;

  return (
    <form onSubmit={submit} noValidate className="flex min-w-56 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          {...field}
          aria-label={`Recargo de ${row.name}`}
          placeholder={defaultMarkup === null ? "Ej: 30,00" : `Usar ${formatMarkup(defaultMarkup)}`}
          inputMode="decimal"
          autoComplete="off"
          disabled={busy}
          aria-invalid={errorMessage ? true : undefined}
          className={`${inputClass} max-w-32`}
        />
        <PrimaryButton type="submit" disabled={busy} className="w-auto min-h-9 px-3 text-xs">
          {isPending ? "…" : "Guardar"}
        </PrimaryButton>
        {row.markupSource === "product" && (
          <Button variant="ghost" size="sm" type="button" onClick={clear} disabled={busy} className={secondaryButtonClass}>
            {isClearing ? "…" : "Usar el del negocio"}
          </Button>
        )}
      </div>
      <span className="text-xs text-fg-muted">
        Recargo {row.markupSourceLabel.toLowerCase()}
      </span>
      {errorMessage && (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      )}
      {state && !state.ok && !errorMessage && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

// Pricing screen (#312): the default markup plus one editable markup per
// product. The page passes the server-derived view; every save returns a new
// view from the server, which this component swaps in without a page reload.
export function PricingScreen({ initialView }: { initialView: PricingView }) {
  const [view, setView] = useState(initialView);
  const [message, setMessage] = useState<string | null>(null);

  const handleSaved = useCallback((next: PricingView) => {
    setView(next);
    setMessage("Recargo guardado.");
  }, []);

  return (
    <main className="px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header>
          <p className="text-sm font-semibold tracking-wide text-brand-green-700 uppercase">
            Costos
          </p>
          <h1 className="mt-1 text-3xl font-bold text-fg sm:text-4xl">Precios</h1>
          <p className="mt-2 max-w-2xl text-base text-fg-muted">
            Cargá un recargo sobre el costo total de cada unidad y mirá el precio sugerido, la
            ganancia y el margen real. Los datos del cálculo se recalculan en cada lectura.
          </p>
        </header>

        {view.banner && (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-[16px] bg-warning-subtle p-4 text-sm text-fg sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">{view.banner.title}</p>
              <p className="mt-1 text-fg-muted">{view.banner.text}</p>
            </div>
            <Link href={view.banner.action.href} className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
              {view.banner.action.label}
            </Link>
          </div>
        )}

        {message && (
          <p role="status" className="rounded-[16px] bg-success-subtle px-4 py-3 text-sm font-medium text-success">
            {message}
          </p>
        )}

        <section
          aria-labelledby="default-markup-heading"
          className="space-y-4 rounded-3xl bg-surface p-5 shadow-sm sm:p-6"
        >
          <div>
            <h2 id="default-markup-heading" className="text-lg font-semibold text-fg">
              Recargo por defecto
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Lo usan todos los productos que no tienen un recargo propio. Actualizarlo cambia sus
              precios, pero no toca los productos con recargo propio.
            </p>
          </div>
          <DefaultMarkupForm value={view.defaultMarkupPercent} onSaved={handleSaved} />
        </section>

        <section
          aria-labelledby="pricing-heading"
          className="space-y-4 rounded-3xl bg-surface p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-1 border-b border-border-default pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="pricing-heading" className="text-lg font-semibold text-fg">
                Precio sugerido por producto
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                El recargo se edita en cada fila. El margen real es la ganancia sobre el precio, no
                el recargo que cargaste.
              </p>
            </div>
            <p className="text-sm text-fg-muted">Período: {view.periodLabel}</p>
          </div>

          {!view.hasProducts ? (
            <div className="p-4 text-center">
              <p className="text-fg-muted">Todavía no cargaste ningún producto.</p>
              <Link href="/products" className={`${linkClass} mt-2`}>
                Ir a productos
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Costo total, recargo, precio sugerido, ganancia y margen real por producto
                </caption>
                <thead>
                  <tr className="border-b border-border-control">
                    <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">
                      Producto
                    </th>
                    <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">
                      Costo total (por unidad)
                    </th>
                    <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">
                      Recargo
                    </th>
                    <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">
                      Precio sugerido
                    </th>
                    <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">
                      Ganancia (por unidad)
                    </th>
                    <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">
                      Margen real
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((row) => (
                    <tr key={row.id} className="border-b border-border-control align-top last:border-0">
                      <th scope="row" className="min-w-40 px-2 py-3 text-left font-semibold text-fg">
                        {row.name}
                        {row.note && (
                          <span className="mt-1 block text-xs font-normal text-warning">
                            {row.note}{" "}
                            {row.noteHref && (
                              <Link href={row.noteHref} className="font-semibold underline underline-offset-2">
                                Cargar capacidad
                              </Link>
                            )}
                          </span>
                        )}
                        <span className="mt-1 block text-xs font-normal text-fg-muted">
                          Recargo vigente: {row.markupDisplay} · {row.markupSourceLabel}
                        </span>
                      </th>
                      <td className="px-2 py-3 text-right whitespace-nowrap">
                        <Figure value={row.unitCost} />
                      </td>
                      <td className="px-2 py-3">
                        <MarkupRowForm row={row} defaultMarkup={view.defaultMarkupPercent} onSaved={handleSaved} />
                      </td>
                      <td className="px-2 py-3 text-right whitespace-nowrap">
                        <Figure value={row.suggestedPrice} emphasis />
                      </td>
                      <td className="px-2 py-3 text-right whitespace-nowrap">
                        <Figure value={row.profit} />
                      </td>
                      <td className="px-2 py-3 text-right whitespace-nowrap">
                        <Figure value={row.realMargin} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-fg-muted">
            Precio sugerido = costo total unitario × (1 + recargo). Margen real = ganancia ÷ precio
            sugerido. El precio no incluye comisiones por venta ni impuestos: son costos de venta
            fuera de este cálculo.
          </p>
        </section>
      </div>
    </main>
  );
}
