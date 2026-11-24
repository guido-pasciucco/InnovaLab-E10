import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth/require-user";
import { buildHomeSummary, type HomePendingTask } from "@/lib/calc/homeSummary";
import { formatARS } from "@/lib/money/format";
import { listPeriodCostsService } from "@/lib/services/business-cost";
import { listProductsService } from "@/lib/services/products";
import { isSupplierOnlyService } from "@/lib/services/suppliers";
import { listSuppliesService } from "@/lib/services/supplies";

import { getShellIdentity } from "../shell-identity";

// P07 — Inicio: landing of the private area after sign-in. A supplier account
// that never used the emprendedor side goes to its own panel instead.
export default async function InicioPage() {
  const user = await requireUser();
  if (await isSupplierOnlyService(user.id)) redirect("/proveedor");

  const [identity, supplies, products, periodCosts] = await Promise.all([
    getShellIdentity(user.id),
    listSuppliesService(user.id),
    listProductsService(user.id),
    listPeriodCostsService(user.id),
  ]);
  const summary = buildHomeSummary({ supplies, products, periodCostLineCount: periodCosts.lines.length });
  const userName = identity.displayName || user.email || "";
  const dashboardReady = summary.dashboardStatus === "inProgress";

  return (
    <main className="px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header>
          <p className="text-sm font-semibold tracking-wide text-brand-green-700 uppercase">
            {identity.businessName && `${identity.businessName} · `}
            {userName}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-fg sm:text-4xl">Bienvenida</h1>
          <p className="mt-2 max-w-2xl text-base text-fg-muted">
            Acá tenés un resumen de tu negocio y los accesos para seguir cargando insumos, armar productos y ver
            los resultados.
          </p>
        </header>

        <section
          aria-labelledby="first-steps-title"
          className="rounded-2xl border border-brand-green-200 bg-brand-green-50 p-5"
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
              href="/insumos"
              className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover ${FOCUS_RING}`}
            >
              Cargar insumos
            </Link>
          </div>
        </section>

        <section aria-labelledby="quick-actions-title">
          <h2 id="quick-actions-title" className="mb-3 text-lg font-semibold text-fg">
            ¿Por dónde empezar?
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <QuickAction href="/insumos" icon="🧺" title="Cargar insumos">
              Registrá lo que comprás y su costo por unidad.
            </QuickAction>
            <QuickAction href="/products" icon="📦" title="Crear producto">
              Armá la receta con tus insumos y el rendimiento.
            </QuickAction>
            <QuickAction href="/period-costs" icon="💰" title="Cargar gastos del período">
              Registrá los gastos indirectos del período.
            </QuickAction>
          </div>
        </section>

        <section aria-labelledby="summary-title">
          <h2 id="summary-title" className="mb-3 text-lg font-semibold text-fg">
            Tu negocio hoy
          </h2>
          <div className="grid gap-4 sm:grid-cols-4">
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
              label="Tablero"
              value={dashboardReady ? "En progreso" : "Pendiente"}
              detail={dashboardReady ? "costo variable listo, faltan resultados" : "faltan datos"}
            />
          </div>
        </section>

        <section aria-labelledby="pending-tasks-title" className="rounded-2xl bg-surface p-5 shadow-sm">
          <h2 id="pending-tasks-title" className="text-lg font-semibold text-fg">
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
                Todo listo para ver el tablero.
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
      return { href: "/insumos", label: "Cargar tus insumos y packaging" };
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
    <Link href={href} className={`rounded-2xl bg-surface p-5 shadow-sm hover:shadow-md ${FOCUS_RING}`}>
      <p className="text-2xl" aria-hidden="true">
        {icon}
      </p>
      <p className="mt-2 font-semibold text-fg">{title}</p>
      <p className="mt-1 text-sm text-fg-muted">{children}</p>
    </Link>
  );
}

function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail: string }) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold text-fg-muted uppercase">{label}</p>
      <p className="mt-2 text-3xl font-bold text-fg">{value}</p>
      <p className="mt-1 text-xs text-fg-muted">{detail}</p>
    </div>
  );
}
