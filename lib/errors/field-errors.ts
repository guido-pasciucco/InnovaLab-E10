import type { ServiceResult } from "./catalog";

// Per-field messages a form can show under each input.
export type FieldErrorMessages = Partial<Record<string, string>>;

// Reads the field errors of a VALIDATION failure, whose details carry
// z.flattenError(): { formErrors: string[], fieldErrors: { field: string[] } }.
// Core module (no Next, no React): safe to import from client components.
// Returns the first message per field; anything malformed yields {}.
export function getFieldErrors(
  state: ServiceResult<unknown> | undefined,
): FieldErrorMessages {
  if (!state || state.ok || state.code !== "VALIDATION") return {};

  const fieldErrors = (state.details as { fieldErrors?: unknown } | null)?.fieldErrors;
  if (typeof fieldErrors !== "object" || fieldErrors === null) return {};

  const messages: FieldErrorMessages = {};
  for (const [field, value] of Object.entries(fieldErrors)) {
    if (Array.isArray(value) && typeof value[0] === "string") {
      messages[field] = value[0];
    }
  }
  return messages;
}
