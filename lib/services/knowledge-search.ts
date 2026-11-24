import "server-only";

import { cosineDistance } from "drizzle-orm";
import { z } from "zod";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { knowledgeChunks } from "@/lib/db/knowledge/table";
import type { EmbedTexts } from "@/lib/services/knowledge-embeddings";

// How many fragments a question gets back. The agent cites these sources.
export const KNOWLEDGE_SEARCH_LIMIT = 5;

const questionSchema = z.string().trim().min(1).max(2_000);

export type KnowledgeHit = {
  sourcePath: string;
  heading: string;
  content: string;
};

// Closest fragments by cosine distance. Documents are global, so this service
// takes no user id. The caller supplies the embedder; tests pass a fake one
// and never call Bedrock.
export async function searchKnowledgeService(
  question: string,
  embedTexts: EmbedTexts,
  db: Db = getDrizzleClient(),
): Promise<KnowledgeHit[]> {
  const text = questionSchema.parse(question);
  const [embedding] = await embedTexts([text]);

  return db
    .select({
      sourcePath: knowledgeChunks.sourcePath,
      heading: knowledgeChunks.heading,
      content: knowledgeChunks.content,
    })
    .from(knowledgeChunks)
    .orderBy(cosineDistance(knowledgeChunks.embedding, embedding))
    .limit(KNOWLEDGE_SEARCH_LIMIT);
}
