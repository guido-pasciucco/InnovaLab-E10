import "server-only";

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { streamText } from "ai";
import type { HelpConfig } from "./config";
import type { HelpModel } from "./types";

export function createBedrockHelpModel(config: HelpConfig): HelpModel {
  const bedrock = createAmazonBedrock({
    region: config.region,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  });

  return {
    stream(input) {
      const result = streamText({
        model: bedrock(config.modelId),
        system: input.system,
        abortSignal: input.abortSignal,
        maxOutputTokens: input.maxOutputTokens,
        messages: input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });

      return {
        textStream: result.textStream,
        usage: Promise.resolve(result.usage).then((usage) => ({
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
        })),
        toTextStreamResponse: () => result.toTextStreamResponse(),
      };
    },
  };
}
