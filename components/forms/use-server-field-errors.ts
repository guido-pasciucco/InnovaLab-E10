import { useEffect } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ServiceResult } from "@/lib/errors/catalog";
import { getFieldErrors } from "@/lib/errors/field-errors";

// Shows server-side field errors (a VALIDATION failure from the action)
// under the matching inputs, through RHF's setError. Covers the case the
// client let through but the server rejected.
// `fields` must be a stable reference (a module-level constant): it is an
// effect dependency. Returns true when at least one listed field got a
// message, so the form can skip the generic "Invalid input" banner.
export function useServerFieldErrors<T extends FieldValues>(
  state: ServiceResult<unknown> | undefined,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  useEffect(() => {
    const messages = getFieldErrors(state);
    for (const field of fields) {
      const message = messages[field];
      if (message) setError(field, { type: "server", message });
    }
  }, [state, setError, fields]);

  const messages = getFieldErrors(state);
  return fields.some((field) => messages[field] !== undefined);
}
