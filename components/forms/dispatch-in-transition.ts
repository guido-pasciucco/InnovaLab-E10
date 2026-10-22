import { startTransition } from "react";

// Envuelve el dispatch manual de useActionState en una transición.
// Sin esto, React avisa que `pending` no se actualizará correctamente.
// P se infiere del dispatch que se le pase en cada form.
//
// Este helper solo arranca la transición: no puede detectar un fallo de
// transporte, porque el dispatch de useActionState devuelve void y React se
// queda con el rechazo. Eso lo maneja useTransportAwareAction, que envuelve
// la Server Action.
export function dispatchInTransition<P>(
  dispatch: (payload: P) => void,
): (data: P) => void {
  return (data: P) => {
    startTransition(() => {
      dispatch(data);
    });
  };
}
