import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth/require-user";
import { buildHomeSummary, type HomePendingTask } from "@/lib/calc/homeSummary";
import { formatARS } from "@/lib/money/format";
import { getBreakEvenService } from "@/lib/services/break-even";
import { listPeriodCostsService } from "@/lib/services/business-cost";
import { getPricingService } from "@/lib/services/pricing";
import { listProductsService } from "@/lib/services/products";
import { isSupplierOnlyService } from "@/lib/services/suppliers";
import { listSuppliesService } from "@/lib/services/supplies";

import { getShellIdentity } from "../shell-identity";

// P07 — Inicio: landing of the private area after sign-in. A supplier account
// that never used the emprendedor side goes to its own panel instead.
export default async function InicioPage() {
  const user = await requireUser();
  if (await isSupplierOnlyService(user.id)) redirect("/proveedor");

  const [identity, supplies, products, periodCosts, pricing, breakEven] = await Promise.all([
    getShellIdentity(user.id),
    listSuppliesService(user.id),
    listProductsService(user.id),
    listPeriodCostsService(user.id),
    getPricingService(user.id),
    getBreakEvenService(user.id, { getPricing: getPricingService }),
  ]);
  const summary = buildHomeSummary({
    supplies,
    products,
    periodCostLineCount: periodCosts.lines.length,
    pricingRows: pricing.rows,
    breakEven,
  });
  const userName = identity.displayName.trim();

  return (
    <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-7">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <header>
          <p className="text-sm font-semibold tracking-wide text-brand-green-700 uppercase">
            {identity.businessName || "Tu negocio"}
          </p>
          <h1 className="mt-1 text-[1.625rem] font-bold tracking-[-0.025em] text-fg sm:text-[1.75rem]">
            {userName ? `Hola, ${userName}` : "Hola"}
            <span aria-hidden="true"> 👋</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-fg-muted sm:text-base">
            Acá tenés un resumen de tu negocio y los accesos para seguir cargando insumos, armar productos y ver
            los resultados.
          </p>
        </header>

        <section
          aria-labelledby="first-steps-title"
          className="rounded-2xl border border-brand-green-200 bg-brand-green-50 p-3.5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="first-steps-title" className="text-sm font-semibold text-brand-green-800">
                <span aria-hidden="true">👋 </span>Primeros pasos
              </h2>
              <p className="mt-1 text-sm text-brand-green-700">
                Te sugerimos empezar por cargar tus insumos y armar tus productos.
              </p>
            </div>
            <Link
              href="/supplies"
              className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-action-primary px-4 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover ${FOCUS_RING}`}
            >
              Cargar insumos
            </Link>
          </div>
        </section>

        <section aria-labelledby="quick-actions-title">
          <h2 id="quick-actions-title" className="mb-2.5 text-base font-semibold text-fg">
            ¿Por dónde empezar?
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickAction href="/supplies" icon="🧺" title="Cargar insumos">
              Registrá lo que comprás y su costo por unidad.
            </QuickAction>
            <QuickAction href="/products" icon="📦" title="Crear producto">
              Armá la receta con tus insumos y el rendimiento.
            </QuickAction>
            <QuickAction href="/period-costs" icon="💰" title="Cargar gastos del período">
              Registrá los gastos indirectos del período.
            </QuickAction>
            <QuickAction href="/precios" icon="🏷️" title="Ver precios">
              Revisá el recargo y el precio sugerido de cada producto.
            </QuickAction>
            <QuickAction href="/equilibrio" icon="📈" title="Ver el equilibrio">
              Conocé cuánto tenés que vender para cubrir los gastos.
            </QuickAction>
          </div>
        </section>

        <section aria-labelledby="summary-title">
          <h2 id="summary-title" className="mb-2.5 text-base font-semibold text-fg">
            Tu negocio hoy
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Insumos" value={summary.supplyCount} detail={`y ${summary.packagingCount} de packaging`} />
            <StatCard
              label="Productos"
              value={summary.productCount}
              detail={`${summary.readyProductCount} con costo variable`}
            />
            <StatCard
              label="Gastos del período"
              value={summary.hasPeriodCosts ? formatARS(periodCosts.total) : "—"}
              detail={summary.hasPeriodCosts ? "en este período" : "cargalos en Gastos del período"}
            />
            <StatCard
              label="Equilibrio"
              value={
                summary.breakEvenReady && summary.breakEvenSales
                  ? formatARS(summary.breakEvenSales)
                  : "Pendiente"
              }
              detail={
                summary.breakEvenReady
                  ? "ventas por mes para cubrir los gastos"
                  : "faltan datos"
              }
              href={summary.breakEvenReady ? "/equilibrio" : undefined}
            />
          </div>
        </section>

        <section aria-labelledby="pending-tasks-title" className="rounded-2xl bg-surface p-3.5 shadow-sm">
          <h2 id="pending-tasks-title" className="text-base font-semibold text-fg">
            Tareas pendientes
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-fg-muted">
            {summary.pendingTasks.map((task) => (
              <TaskItem key={task.kind} task={task} />
            ))}
            {summary.allReady && (
              <li className="flex items-center gap-2">
                <span className="text-green-600" aria-hidden="true">
                  ●
                </span>
                Todo listo para ver el equilibrio.
              </li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function taskLink(task: HomePendingTask): { href: string; label: string } {
  switch (task.kind) {
    case "loadSupplies":
      return { href: "/supplies", label: "Cargar tus insumos y packaging" };
    case "createFirstProduct":
      return { href: "/products", label: "Crear tu primer producto y su receta" };
    case "completeRecipes":
      return {
        href: "/products",
        label: `Completar la receta y el rendimiento de ${plural(task.count, "producto", "productos")}`,
      };
    case "reviewUnavailableCosts":
      return {
        href: "/products",
        label: `Revisar ${plural(task.count, "producto cuyo costo no se puede calcular", "productos cuyo costo no se puede calcular")}`,
      };
    case "loadPeriodCosts":
      return { href: "/period-costs", label: "Cargar los gastos del período" };
    case "loadCapacity":
      return {
        href: "/products",
        label: `Cargar la capacidad mensual de ${plural(task.count, "producto", "productos")}`,
      };
    case "loadMarkup":
      return {
        href: "/precios",
        label: `Cargar el recargo de ${plural(task.count, "producto", "productos")}`,
      };
    case "reviewPrices":
      return {
        href: "/precios",
        label: "Revisar los precios: con los actuales no se llega al equilibrio",
      };
  }
}

function TaskItem({ task }: { task: HomePendingTask }) {
  const link = taskLink(task);
  return (
    <li className="flex items-center gap-2">
      <span className="text-amber-500" aria-hidden="true">
        ●
      </span>
      <Link href={link.href} className={`rounded text-brand-green-700 hover:underline ${FOCUS_RING}`}>
        {link.label}
      </Link>
    </li>
  );
}

function QuickAction({ href, icon, title, children }: { href: string; icon: string; title: string; children: ReactNode }) {
  return (
    <Link href={href} className={`rounded-2xl bg-surface p-3.5 shadow-sm hover:shadow-md ${FOCUS_RING}`}>
      <p className="text-lg" aria-hidden="true">
        {icon}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-fg">{title}</p>
      <p className="mt-1 text-sm text-fg-muted">{children}</p>
    </Link>
  );
}

function StatCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-xs font-semibold text-fg-muted uppercase">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-[-0.02em] text-fg">{value}</p>
      <p className="mt-1 text-xs text-fg-muted">{detail}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`block rounded-2xl bg-surface p-3.5 shadow-sm hover:shadow-md ${FOCUS_RING}`}>
        {content}
      </Link>
    );
  }

  return <div className="rounded-2xl bg-surface p-3.5 shadow-sm">{content}</div>;
}
