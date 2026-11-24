import "server-only";

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import type { LanguageModel } from "ai";

import { AppError } from "@/lib/errors/app-error";

export const CHAT_DATOS_BEDROCK_REGION = "us-east-1";

type ModelEnv = Record<string, string | undefined>;

// Claude on Bedrock. Credentials come from CHAT_DATOS_AWS_* and are passed
// explicitly, so the client never picks up the help assistant's AWS_* keys.
// Nothing is sent until the first question: the client is created per request.
export function createChatDatosModel(
  modelId: string,
  env: ModelEnv = process.env,
  fetchImpl?: typeof fetch,
): LanguageModel {
  const accessKeyId = env.CHAT_DATOS_AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.CHAT_DATOS_AWS_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) {
    throw new AppError("CHAT_DATOS_UNAVAILABLE");
  }

  const bedrock = createAmazonBedrock({
    region: CHAT_DATOS_BEDROCK_REGION,
    accessKeyId,
    secretAccessKey,
    fetch: fetchImpl,
  });
  return bedrock(modelId);
}
