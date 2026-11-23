import { z } from "zod";

import { parseAmountInput } from "@/lib/money/format";
import { conceptField } from "./fields";

// Form contract of the Gastos del período catalog modal (#285). Keys match the
// public input of the period-cost service. No `id` and no `period` travel from
// the form: the server owns the row id and the month the screen is showing.
//
// The amount is typed with the Argentine format (20.000,50) and stored as the
// canonical decimal string (20000.50) the service expects. `parseAmountInput`
// is used instead of a plain formatter so invalid values keep their reason
// (empty, not a number, negative, too many decimals) and surface the Spanish
// message defined once in `fields.ts`.
export const periodCostLineSchema = z.object({
  concept: conceptField,
  amountPeriod: z.string().trim().transform((value, ctx) => {
    const parsed = parseAmountInput(value);
    if (parsed.issue !== null) {
      ctx.addIssue({ code: "custom", message: parsed.issue });
      return z.NEVER;
    }
    return parsed.amount;
  }),
});

export type PeriodCostLineFormValues = z.infer<typeof periodCostLineSchema>;
