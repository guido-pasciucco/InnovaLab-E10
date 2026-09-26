import { startTransition } from "react";

// Envuelve el dispatch manual de useActionState en una transición.
// Sin esto, React avisa que `pending` no se actualizará correctamente.
// P se infiere del dispatch que se le pase en cada form.
export function dispatchInTransition<P>(
  dispatch: (payload: P) => void,
): (data: P) => void {
  return (data: P) => {
    startTransition(() => {
      dispatch(data);
    });
  };
}
