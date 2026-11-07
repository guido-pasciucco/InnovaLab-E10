"use server";

import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import type { ServiceResult } from "@/lib/errors/catalog";

// DEMO ONLY — remove this file with the /demo-errores section.
// The server schema is intentionally separate from the client form: the
// point of the example is that the server is the source of truth.
const demoSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }),
});

export type DemoFormValues = {
  email: string;
  mode: "ok" | "domain";
};

export type DemoActionState = ServiceResult<{ email: string }> | undefined;

// The action never throws to the client: handleActionErrors turns every
// failure into a ServiceResult the form can render.
export const demoAction = handleActionErrors(
  async (_prevState: DemoActionState, values: DemoFormValues) => {
    // Domain failure: a code goes out, the catalog owns the message.
    if (values.mode === "domain") {
      throw new AppError("CALC_UNAVAILABLE");
    }

    // ZodError -> VALIDATION + details.fieldErrors (see toAppError).
    // An empty or malformed email exercises the per-field path.
    const data = demoSchema.parse({ email: values.email });

    return { email: data.email };
  },
);
