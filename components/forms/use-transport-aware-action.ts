"use client";

import { unstable_rethrow } from "next/navigation";
import { useCallback, useState } from "react";

export const TRANSPORT_ERROR_MESSAGE = "No se pudo enviar el formulario. Revisá tu conexión e intentá nuevamente";
export const GENERIC_SUBMIT_ERROR_MESSAGE = "No se pudo enviar el formulario. Intentá nuevamente";

// fetch rejects with a TypeError when the request never reaches the server
// ("Failed to fetch", "fetch failed", "Load failed"). Anything else is an
// unexpected failure, not a connection problem.
export function toSubmitErrorMessage(error: unknown): string {
  return error instanceof TypeError ? TRANSPORT_ERROR_MESSAGE : GENERIC_SUBMIT_ERROR_MESSAGE;
}

export function useTransportAwareAction<S, P, R>(serverAction: (prevState: S, payload: P) => Promise<R>) {
  const [transportError, setTransportError] = useState<string | null>(null);

  const clearTransportError = useCallback(() => setTransportError(null), []);

  const action = useCallback(
    async (prevState: S, payload: P): Promise<R | undefined> => {
      setTransportError(null);
      try {
        return await serverAction(prevState, payload);
      } catch (error) {
        unstable_rethrow(error);
        console.error("[useTransportAwareAction] submit failed", error);
        setTransportError(toSubmitErrorMessage(error));
        return undefined;
      }
    },
    [serverAction],
  );

  return { action, transportError, clearTransportError };
}
