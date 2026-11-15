import "server-only";

import { buildHelpSystemPrompt } from "@/lib/help/prompt";
import type { HelpModel } from "@/lib/help/types";
import { helpRequestSchema } from "@/lib/schemas/help/help";

// Turns a validated thread into a model stream. The caller supplies the
// model and the product text, so tests never contact Bedrock.
export function streamHelpReply(raw: unknown, model: HelpModel, corpus: string) {
  const { messages } = helpRequestSchema.parse(raw);
  return model.stream({
    system: buildHelpSystemPrompt(corpus),
    messages,
  });
}
