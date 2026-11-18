import { z } from "zod";

// Dev-only: derive a preview message by parsing a deliberately invalid sample
// through the real contract. The demo can never invent a rule or a text: the
// message is exactly the one the form would show for that input.
export function previewFieldMessage(
  schema: z.ZodType,
  input: unknown,
  field: string,
): string | null {
  const result = schema.safeParse(input);
  if (result.success) return null;
  // The schema type is erased at the call site, so read the flattened map
  // by key instead of inferring a shape the helper cannot know.
  const fieldErrors = z.flattenError(result.error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
  return fieldErrors[field]?.[0] ?? null;
}
