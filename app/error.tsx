"use client";

import { useEffect } from "react";

export default function Error({
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
    <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-2xl font-bold">
        Ha ocurrido un error
      </h2>

      <p className="text-fg-muted">
        Algo salió mal. Inténtalo de nuevo.
      </p>

      <button
        type="button"
        onClick={() => retry()}
        className= "rounded bg-action-primary px-4 py-2 font-medium text-on-action-primary hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      >
        Reintentar
      </button>
    </div>
  );
}