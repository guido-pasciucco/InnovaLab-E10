"use client";

import { unstable_rethrow } from "next/navigation";
import { useCallback, useState } from "react";

export const TRANSPORT_ERROR_MESSAGE = "No se pudo enviar el formulario. Revisá tu conexión e intentá nuevamente";

export function useTransportAwareAction<S, P, R>(serverAction: (prevState: S, payload: P) => Promise<R>) {
  const [transportError, setTransportError] = useState<string | null>(null);

  const action = useCallback(
    async (prevState: S, payload: P): Promise<R | undefined> => {
      setTransportError(null);
      try {
        return await serverAction(prevState, payload);
      } catch (error) {
        unstable_rethrow(error);
        setTransportError(TRANSPORT_ERROR_MESSAGE);
        return undefined;
      }
    },
    [serverAction],
  );

  return { action, transportError };
}
