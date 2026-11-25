import { z } from "zod";

import { markupPercentField } from "./fields";

// Form contract for the editable markup (business default and product row).
// The server never validates with this contract: it uses the shared rule from
// fields.ts through lib/db/business/validation.ts.
export const markupFormSchema = z.object({
  markupPercent: markupPercentField,
});

// The input accepts text from the form (and a number from other callers); the
// parsed value is always a canonical decimal string.
export type MarkupFormInput = z.input<typeof markupFormSchema>;
export type MarkupFormValues = z.infer<typeof markupFormSchema>;
