"use client";
import "./globals.css";
import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {

  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h2 className="text-2xl font-bold">
            Error crítico de la aplicación
          </h2>

          <p className="text-fg-muted">
            Se produjo un error inesperado.
          </p>
          {error.digest && (
            <p className="text-fg-muted">
              Digest: {error.digest}
            </p>
          )}

          <button
            onClick={() => retry()}
            className="rounded bg-action-primary px-4 py-2 text-on-action-primary"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}