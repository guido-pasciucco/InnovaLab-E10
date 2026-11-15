import type { HelpMessage } from "@/lib/schemas/help/help";

export type HelpUsage = {
  inputTokens: number;
  outputTokens: number;
};

// The route and the terminal script share this shape. The Bedrock client
// is one implementation; another provider replaces this object.
export type HelpModel = {
  stream(input: { system: string; messages: HelpMessage[] }): {
    textStream: AsyncIterable<string>;
    usage: Promise<HelpUsage>;
    toTextStreamResponse: () => Response;
  };
};
