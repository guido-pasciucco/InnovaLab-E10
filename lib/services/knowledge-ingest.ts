import "server-only";

import { and, eq, inArray, like, notInArray } from "drizzle-orm";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { knowledgeChunks } from "@/lib/db/knowledge/table";
import { chunkMarkdown, type KnowledgeFragment } from "@/lib/knowledge/chunk";
import type { EmbedTexts } from "@/lib/services/knowledge-embeddings";

export type KnowledgeDocument = {
  sourcePath: string;
  markdown: string;
};

export type IngestKnowledgeResult = {
  inserted: number;
  unchanged: number;
  removed: number;
};

// Rebuilds knowledge_chunks for the given documents. A fragment whose
// heading and text did not change keeps its row and is not embedded again.
// Fragments that disappeared, and documents removed under `dropMissingUnder`,
// are deleted. Documents are global: there is no owner.
export async function ingestKnowledgeDocumentsService(
  documents: KnowledgeDocument[],
  embedTexts: EmbedTexts,
  db: Db = getDrizzleClient(),
  dropMissingUnder?: string,
): Promise<IngestKnowledgeResult> {
  const result: IngestKnowledgeResult = { inserted: 0, unchanged: 0, removed: 0 };

  await db.transaction(async (tx) => {
    for (const document of documents) {
      const counts = await ingestOne(tx, document, embedTexts);
      result.inserted += counts.inserted;
      result.unchanged += counts.unchanged;
      result.removed += counts.removed;
    }

    if (dropMissingUnder && documents.length > 0) {
      const removed = await tx
        .delete(knowledgeChunks)
        .where(
          and(
            like(knowledgeChunks.sourcePath, `${dropMissingUnder}%`),
            notInArray(
              knowledgeChunks.sourcePath,
              documents.map((document) => document.sourcePath),
            ),
          ),
        )
        .returning({ id: knowledgeChunks.id });
      result.removed += removed.length;
    }
  });

  return result;
}

type KnowledgeExecutor = Pick<Db, "select" | "insert" | "delete">;

async function ingestOne(
  tx: KnowledgeExecutor,
  document: KnowledgeDocument,
  embedTexts: EmbedTexts,
): Promise<IngestKnowledgeResult> {
  const fragments = chunkMarkdown(document.markdown);
  const hashes = fragments.map((fragment) => fragment.contentHash);

  const existing = await tx
    .select({ contentHash: knowledgeChunks.contentHash })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.sourcePath, document.sourcePath));
  const existingHashes = new Set(existing.map((row) => row.contentHash));

  const fresh = fragments.filter((fragment) => !existingHashes.has(fragment.contentHash));
  if (fresh.length > 0) {
    const embeddings = await embedTexts(fresh.map(embeddableText));
    await tx.insert(knowledgeChunks).values(
      fresh.map((fragment, index) => ({
        sourcePath: document.sourcePath,
        heading: fragment.heading,
        content: fragment.content,
        contentHash: fragment.contentHash,
        embedding: embeddings[index],
      })),
    );
  }

  const stale = existing.filter((row) => !hashes.includes(row.contentHash));
  if (stale.length > 0) {
    await tx
      .delete(knowledgeChunks)
      .where(
        and(
          eq(knowledgeChunks.sourcePath, document.sourcePath),
          inArray(
            knowledgeChunks.contentHash,
            stale.map((row) => row.contentHash),
          ),
        ),
      );
  }

  return { inserted: fresh.length, unchanged: fragments.length - fresh.length, removed: stale.length };
}

function embeddableText(fragment: KnowledgeFragment): string {
  return `${fragment.heading}\n\n${fragment.content}`;
}
