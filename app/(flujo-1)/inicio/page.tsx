import { requireUser } from "@/lib/auth/require-user";
import { getProfileSummaryService } from "@/lib/services/profile";
import { getUserDefaultBusiness } from "@/lib/services/supplies";
import { listProductsService } from "@/lib/services/products";
import { listSuppliesService } from "@/lib/services/supplies";

// P07 — Inicio / bienvenida del área privada (flujo 1).
export default async function InicioPage() {
  const user = await requireUser();
  const [profile, business, supplies, products] = await Promise.all([
    getProfileSummaryService(user.id),
    getUserDefaultBusiness(user.id),
    listSuppliesService(user.id),
    listProductsService(user.id),
  ]);

  const userName = profile.displayName ?? user.email ?? "";
  const businessName = business?.name ?? "";
  const supplyCount = supplies.filter((s) => s.kind === "supply").length;
  const packagingCount = supplies.filter((s) => s.kind === "packaging").length;
  const productCount = products.length;
  const readyProducts = products.filter((p) => p.variableCosts !== null).length;

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header>
          <p className="text-sm font-semibold tracking-wide text-brand-green-700 uppercase">
            {businessName && `${businessName} · `}
            {userName}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-fg sm:text-4xl">
            Bienvenida
          </h1>
          <p className="mt-2 max-w-2xl text-base text-fg-muted">
            Acá tenés un resumen de tu negocio y los accesos para seguir cargando
            insumos, armar productos y ver los resultados.
          </p>
        </header>

        {/* Onboarding guiado (primer ingreso) */}
        <section
          aria-label="Onboarding"
          className="rounded-2xl border border-brand-green-200 bg-brand-green-50 p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-green-800">
                👋 Primeros pasos
              </p>
              <p className="mt-1 text-sm text-brand-green-700">
                Te guiamos paso a paso: cargá tus insumos, armá tus productos y
                obtené precios y resultados.
              </p>
            </div>
            <a
              href="/insumos"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Empezar tutorial
            </a>
          </div>
        </section>

        {/* Accesos rápidos */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-fg">¿Por dónde empezar?</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <a
              href="/insumos"
              className="rounded-2xl bg-surface p-5 shadow-sm hover:shadow-md"
            >
              <p className="text-2xl" aria-hidden="true">🧺</p>
              <p className="mt-2 font-semibold text-fg">Cargar insumos</p>
              <p className="mt-1 text-sm text-fg-muted">
                Registrá lo que comprás y su costo por unidad.
              </p>
            </a>
            <a
              href="/products"
              className="rounded-2xl bg-surface p-5 shadow-sm hover:shadow-md"
            >
              <p className="text-2xl" aria-hidden="true">📦</p>
              <p className="mt-2 font-semibold text-fg">Crear producto</p>
              <p className="mt-1 text-sm text-fg-muted">
                Armá la receta con tus insumos y el rendimiento.
              </p>
            </a>
            <a
              href="/period-costs"
              className="rounded-2xl bg-surface p-5 shadow-sm hover:shadow-md"
            >
              <p className="text-2xl" aria-hidden="true">💰</p>
              <p className="mt-2 font-semibold text-fg">Cargar gastos</p>
              <p className="mt-1 text-sm text-fg-muted">
                Registrá los costos indirectos del mes.
              </p>
            </a>
          </div>
        </section>

        {/* Resumen */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-fg">Tu negocio hoy</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl bg-surface p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-fg-muted">Insumos</p>
              <p className="mt-2 text-3xl font-bold text-fg">{supplyCount}</p>
              <p className="mt-1 text-xs text-fg-muted">{packagingCount} de packaging</p>
            </div>
            <div className="rounded-2xl bg-surface p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-fg-muted">Productos</p>
              <p className="mt-2 text-3xl font-bold text-fg">{productCount}</p>
              <p className="mt-1 text-xs text-fg-muted">{readyProducts} con costo variable</p>
            </div>
            <div className="rounded-2xl bg-surface p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-fg-muted">Costos indirectos</p>
              <p className="mt-2 text-3xl font-bold text-fg">—</p>
              <p className="mt-1 text-xs text-fg-muted">cargalos en Costos</p>
            </div>
            <div className="rounded-2xl bg-surface p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-fg-muted">Tablero</p>
              <p className="mt-2 text-3xl font-bold text-fg">Pendiente</p>
              <p className="mt-1 text-xs text-fg-muted">faltan resultados</p>
            </div>
          </div>
        </section>

        {/* Tareas pendientes */}
        <section className="rounded-2xl bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-fg">Tareas pendientes</h2>
          <ul className="mt-3 space-y-2 text-sm text-fg-muted">
            <li className="flex items-center gap-2">
              <span className="text-amber-500" aria-hidden="true">●</span>
              Completar la receta y el rendimiento de los productos sin costo variable.
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-500" aria-hidden="true">●</span>
              Cargar los gastos indirectos del mes.
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-500" aria-hidden="true">●</span>
              Definir la capacidad mensual de cada producto.
            </li>
          </ul>
        </section>

        {/* Configuraciones / datos históricos (por definir) */}
        <section className="rounded-2xl border border-dashed border-border-default p-4 text-sm text-fg-muted">
          <p>
            <strong className="text-fg">Configuraciones</strong> y{" "}
            <strong className="text-fg">Datos históricos</strong> (alcance por
            definir con el equipo): volver a ver el onboarding, ayuda, ajustes de
            cuenta y consulta de cálculos de períodos anteriores.
          </p>
        </section>
      </div>
    </main>
  );
}
