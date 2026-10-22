"use client";

import { useCallback, useState } from "react";
import { unstable_rethrow } from "next/navigation";

// Message shown when the request never reached the server (no network, a
// deploy cutting the connection). The server action never ran, so there is
// no result to show: this is a transport failure, not a domain one.
export const TRANSPORT_ERROR_MESSAGE =
  "No se pudo enviar el formulario. Revisá tu conexión e intentá nuevamente";

// Wraps a server action so a transport failure becomes a visible state
// instead of a mute submit.
//
// Why the action and not the dispatch: the dispatch of `useActionState`
// returns void, and React attaches its own handlers to the promise of the
// action. When the request fails on the way, React marks the action as
// rejected and clears `pending` without writing any state, so nobody
// outside React can observe the rejection. The only place that can catch
// it is the call to the action itself, which is what this wrapper does.
//
// The wrapper always settles: on success it returns the result of the
// server, on a transport failure it returns `undefined` ("no server
// result") and records the error for the form to show.
//
// S, P and R are separate on purpose: S is the state the form holds (it
// includes `undefined`, the initial value), R is what the server answers.
// Tying them would make TypeScript infer S from the return of the action
// and drop the `undefined` of the initial state.
export function useTransportAwareAction<S, P, R>(
  serverAction: (prevState: S, payload: P) => Promise<R>,
) {
  const [transportError, setTransportError] = useState<string | null>(null);

  const action = useCallback(
    async (prevState: S, payload: P): Promise<R | undefined> => {
      setTransportError(null);
      try {
        return await serverAction(prevState, payload);
      } catch (err) {
        // Los redirects de Next (p. ej. requireUser() → /login) llegan como
        // rechazo: hay que dejarlos pasar, o el usuario no llega a la página
        // de destino y ve un falso error de conexión.
        unstable_rethrow(err);
        setTransportError(TRANSPORT_ERROR_MESSAGE);
        // `undefined` means "no server result": the request never reached
        // the app. Every form state of the repo (LoginState,
        // CalculatorSetupState, ...) already includes it.
        return undefined;
      }
    },
    [serverAction],
  );

  return { action, transportError };
}
