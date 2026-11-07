"use client";

import Link from "next/link";

// DEMO ONLY — remove this file with the /demo-errores section.
// Same contract as app/(calculator)/error.tsx: Next 16.3.5 does not
// generate an ErrorProps type, so the props are declared manually.
// reset() re-renders the segment, but the URL still carries ?fail=1, so
// the read throws again. A soft <Link> to the healthy URL is not enough
// either: the segment does not remount and this boundary keeps its error
// state. The anchor below forces a full document load, which does remount.
type DemoRscErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DemoRscError({ error, reset }: DemoRscErrorProps) {
  return (
    <main
      role="alert"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-3 px-6 py-12"
    >
      <h1 className="text-2xl font-semibold">La lectura de ejemplo falló</h1>
      <p className="text-sm text-gray-700">
        Este es el boundary del segmento <code>/demo-errores/rsc</code>:
        reemplazó la página entera porque el throw ocurrió en el Server
        Component.
      </p>
      {error.digest ? (
        <p className="text-sm text-gray-500">Referencia: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Reintentar
        </button>
        {/* Plain anchor on purpose: a soft Link keeps this boundary mounted
            and its error state; a full load remounts the segment. */}
        <a
          href="/demo-errores/rsc"
          className="text-sm font-medium underline underline-offset-4"
        >
          Volver a la versión sana
        </a>
        <Link
          href="/demo-errores"
          className="text-sm font-medium underline underline-offset-4"
        >
          Volver a la demo
        </Link>
      </div>
    </main>
  );
}
