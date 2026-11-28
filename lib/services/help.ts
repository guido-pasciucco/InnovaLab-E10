import "server-only";

import { buildHelpSystemPrompt } from "@/lib/help/prompt";
import type { HelpModel } from "@/lib/help/types";
import { helpRequestSchema } from "@/lib/schemas/help/help";

export const HELP_MAX_OUTPUT_TOKENS = 500;

// Turns a validated thread into a model stream. The caller supplies the
// model and the product text, so tests never contact Bedrock.
export function streamHelpReply(
  raw: unknown,
  model: HelpModel,
  corpus: string,
  abortSignal?: AbortSignal,
  options: { chatDatosEnabled?: boolean } = {},
) {
  const { messages } = helpRequestSchema.parse(raw);
  return model.stream({
    system: buildHelpSystemPrompt(corpus, options),
    messages,
    abortSignal,
    maxOutputTokens: HELP_MAX_OUTPUT_TOKENS,
  });
}
