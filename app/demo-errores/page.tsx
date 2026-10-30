import type { Metadata } from "next";
import Link from "next/link";

import { ActionDemoForm } from "./_components/action-demo-form";
import { CrashOnPurpose } from "./_components/crash-on-purpose";
import { EnvelopeDemo } from "./_components/envelope-demo";
import { SectionBoundary } from "./_components/section-boundary";

// DEMO ONLY — remove the whole /demo-errores route (this page, actions.ts,
// _components, rsc and envelope) once the team no longer needs the examples.
export const metadata: Metadata = {
  title: "Demo de errores",
};

const EMPTY_ROWS: readonly string[] = [];

export default function DemoErroresPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Sección de demostración — no es código de producción
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Cómo usar errores en componentes
        </h1>
        <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Cada bloque muestra un camino distinto y funciona de verdad. Los
          archivos llevan el comentario <code>DEMO ONLY</code> para poder
          borrarlos enteros cuando el equipo ya no los necesite.
        </p>
      </header>

      <EmptyVsErrorSection />
      <ActionSection />
      <RscSection />
      <BoundarySection />
      <EnvelopeSection />
    </main>
  );
}

function EmptyVsErrorSection() {
  return (
    <section
      aria-labelledby="empty-title"
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <h2 id="empty-title" className="text-xl font-semibold">
        1. Vacío no es error
      </h2>
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Una lectura exitosa con cero filas se renderiza como estado vacío. Solo
        un fallo real llega a la frontera de error. Son dos renders distintos.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="text-sm font-medium">
            Lista vacía (ok, {EMPTY_ROWS.length} filas)
          </h3>
          {EMPTY_ROWS.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Todavía no cargaste costos. Empezá por el primero.
            </p>
          ) : (
            <ul className="list-inside list-disc text-sm">
              {EMPTY_ROWS.map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">
            Fallo de lectura (error)
          </h3>
          <p className="text-sm text-red-700">
            No se pudieron cargar los costos.
          </p>
          <p className="text-xs text-red-600">
            Reintentar no borra el error: la operación falló.
          </p>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        Archivo: <code>app/demo-errores/page.tsx</code> (sección 1).
      </p>
    </section>
  );
}

function ActionSection() {
  return (
    <section
      aria-labelledby="action-title"
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <h2 id="action-title" className="text-xl font-semibold">
        2. Error de Server Action
      </h2>
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        El formulario usa <code>useActionState</code>. La action nunca lanza al
        cliente: devuelve un <code>ServiceResult</code>. Probá dejando el correo
        vacío o inválido (fallo <code>VALIDATION</code> con error por campo) o
        eligiendo la falla de dominio (banner con el mensaje del catálogo).
      </p>
      <ActionDemoForm />
      <p className="text-xs text-zinc-500">
        Archivos: <code>actions.ts</code> y{" "}
        <code>_components/action-demo-form.tsx</code>.
      </p>
    </section>
  );
}

function RscSection() {
  return (
    <section
      aria-labelledby="rsc-title"
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <h2 id="rsc-title" className="text-xl font-semibold">
        3. Error de lectura RSC
      </h2>
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        La página <code>/demo-errores/rsc</code> lee datos en el servidor con{" "}
        <code>handleRscErrors</code>. Si la lectura falla, el error se re-lanza
        y lo captura <code>error.tsx</code> de ese segmento, que reemplaza la
        página entera. Ese boundary no captura errores del{" "}
        <code>layout.tsx</code> del mismo segmento ni de event handlers.
        Tampoco se resetea al cambiar solo los search params: volver con un{" "}
        <code>Link</code> suave al mismo segmento conserva el estado de error.
        Por eso el enlace sano del boundary hace una navegación completa.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link
          href="/demo-errores/rsc"
          className="text-sm font-medium underline underline-offset-4"
        >
          Ver la lectura sana
        </Link>
        <Link
          href="/demo-errores/rsc?fail=1"
          className="text-sm font-medium text-red-700 underline underline-offset-4"
        >
          Disparar el error
        </Link>
      </div>
      <p className="text-xs text-zinc-500">
        Archivos: <code>rsc/page.tsx</code> y <code>rsc/error.tsx</code>.
      </p>
    </section>
  );
}

function BoundarySection() {
  return (
    <section
      aria-labelledby="boundary-title"
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <h2 id="boundary-title" className="text-xl font-semibold">
        4. Boundary de componente
      </h2>
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Un boundary propio aísla un bloque: si el componente lanza durante el
        render, solo ese bloque muestra el fallback y el resto de la página
        sigue funcionando. En producción el mensaje del error no se muestra; se
        usa como referencia de soporte.
      </p>
      <SectionBoundary
        fallback={
          <p
            role="alert"
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            Este bloque falló. El resto de la página sigue vivo.
          </p>
        }
      >
        <CrashOnPurpose />
      </SectionBoundary>
      <p className="text-xs text-zinc-500">
        Archivos: <code>_components/section-boundary.tsx</code> y{" "}
        <code>_components/crash-on-purpose.tsx</code>.
      </p>
    </section>
  );
}

function EnvelopeSection() {
  return (
    <section
      aria-labelledby="envelope-title"
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <h2 id="envelope-title" className="text-xl font-semibold">
        5. Route Handler + ErrorEnvelope
      </h2>
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Cuando la UI necesita decidir el render en el cliente, el Route Handler
        responde un <code>ErrorEnvelope</code> y la isla cliente lo muestra
        inline, sin <code>error.tsx</code>.
      </p>
      <EnvelopeDemo />
      <p className="text-xs text-zinc-500">
        Archivos: <code>envelope/route.ts</code> y{" "}
        <code>_components/envelope-demo.tsx</code>.
      </p>
    </section>
  );
}
