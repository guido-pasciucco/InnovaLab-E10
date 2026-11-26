"use client";

import { Button } from "@/components/ui/button";

import { useEffect } from "react";

// A failed page inside the shell keeps the navbar and sidebar, so the user can
// retry or move to another screen instead of losing the navigation.
export default function FlowOneError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="px-4 py-10 sm:px-6">
      <div role="alert" className="mx-auto flex w-full max-w-5xl flex-col items-start gap-4">
        <h1 className="text-2xl font-bold text-fg">No pudimos cargar esta pantalla</h1>
        <p className="text-fg-muted">Algo salió mal. Probá de nuevo o elegí otra sección del menú.</p>
        <Button variant="primary" size="md"
          type="button"
          onClick={() => retry()}
          className="rounded! bg-action-primary! px-4! py-2! font-medium! text-on-action-primary! hover:bg-action-primary-hover! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus!"
        >
          Reintentar
        </Button>
      </div>
    </main>
  );
}
