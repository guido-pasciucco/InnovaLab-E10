import "server-only";

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { embedMany } from "ai";

import { KNOWLEDGE_EMBEDDING_DIMENSIONS } from "@/lib/db/knowledge/table";
import { AppError } from "@/lib/errors/app-error";

// Titan Text Embeddings V2. The model id can be overridden for a test double;
// the dimension stays 1024 because knowledge_chunks.embedding is vector(1024).
export const DEFAULT_EMBEDDING_MODEL = "amazon.titan-embed-text-v2:0";
const BEDROCK_REGION = "us-east-1";
// Titan takes one text per request. Without a cap, embedMany sends every
// request of a long document at once and Bedrock may throttle them.
export const MAX_PARALLEL_EMBEDDING_CALLS = 5;

export type EmbedTexts = (values: string[]) => Promise<number[][]>;

type EmbeddingEnv = Record<string, string | undefined>;

// Credentials are read from CHAT_DATOS_AWS_* and passed explicitly, so this
// client never picks up the help assistant's AWS_* keys.
export function createBedrockEmbedder(
  env: EmbeddingEnv = process.env,
  fetchImpl?: typeof fetch,
): EmbedTexts {
  const accessKeyId = env.CHAT_DATOS_AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.CHAT_DATOS_AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new AppError("KNOWLEDGE_UNAVAILABLE");
  }

  const bedrock = createAmazonBedrock({
    region: BEDROCK_REGION,
    accessKeyId,
    secretAccessKey,
    fetch: fetchImpl,
  });
  const model = bedrock.embedding(env.CHAT_DATOS_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL);

  return async (values) => {
    const { embeddings } = await embedMany({
      model,
      values,
      // Titan accepts 256, 512 or 1024. The column is fixed at 1024.
      dimensions: KNOWLEDGE_EMBEDDING_DIMENSIONS,
      providerOptions: { bedrock: { normalize: true } },
      maxParallelCalls: MAX_PARALLEL_EMBEDDING_CALLS,
      maxRetries: 2,
    });
    for (const embedding of embeddings) {
      if (embedding.length !== KNOWLEDGE_EMBEDDING_DIMENSIONS) {
        throw new AppError("KNOWLEDGE_UNAVAILABLE");
      }
    }
    return embeddings;
  };
}
