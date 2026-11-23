"use client";

import { startTransition, useActionState, type FormEvent } from "react";

import type { ServiceResult } from "@/lib/errors/catalog";
import { getFieldErrors } from "@/lib/errors/field-errors";

type FormDataAction<T> = (
  previous: ServiceResult<T> | undefined,
  data: FormData,
) => Promise<ServiceResult<T>>;

// Native form + Server Action without react-hook-form: the server validates
// and its field errors show under each input. Dispatching from onSubmit
// (instead of <form action>) keeps what the user typed when the server
// rejects it, because React only resets forms that use the action prop.
export function useFormDataAction<T>(action: FormDataAction<T>) {
  const [state, dispatch, pending] = useActionState(action, undefined);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }

  const fieldErrors = getFieldErrors(state);
  // A failure that is not about one field (or names a field the form does
  // not show) goes to the banner.
  const formError =
    state && !state.ok && Object.keys(fieldErrors).length === 0 ? state.message : null;

  return { state, pending, onSubmit, fieldErrors, formError };
}
