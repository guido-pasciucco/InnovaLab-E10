import "server-only";

import { and, eq, inArray, like, notInArray } from "drizzle-orm";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { knowledgeChunks } from "@/lib/db/knowledge/table";
import { AppError } from "@/lib/errors/app-error";
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

type DocumentPlan = {
  sourcePath: string;
  fresh: KnowledgeFragment[];
  unchanged: number;
  staleHashes: string[];
};

// Rebuilds knowledge_chunks for the given documents. A fragment whose
// heading and text did not change keeps its row and is not embedded again.
// Fragments that disappeared, and documents removed under `dropMissingUnder`,
// are deleted. Documents are global: there is no owner.
//
// Three steps, in this order, so no database connection waits on Bedrock:
// 1. read what is already stored (no transaction);
// 2. embed the new fragments (a failure here has written nothing);
// 3. apply every insert and delete in one short transaction, all or none.
export async function ingestKnowledgeDocumentsService(
  documents: KnowledgeDocument[],
  embedTexts: EmbedTexts,
  db: Db = getDrizzleClient(),
  dropMissingUnder?: string,
): Promise<IngestKnowledgeResult> {
  const plans: DocumentPlan[] = [];
  for (const document of documents) {
    plans.push(await planDocument(db, document));
  }

  const freshFragments = plans.flatMap((plan) => plan.fresh);
  const embeddings =
    freshFragments.length > 0 ? await embedTexts(freshFragments.map(embeddableText)) : [];
  if (embeddings.length !== freshFragments.length) {
    throw new AppError("KNOWLEDGE_UNAVAILABLE");
  }

  const result: IngestKnowledgeResult = { inserted: 0, unchanged: 0, removed: 0 };

  await db.transaction(async (tx) => {
    let offset = 0;
    for (const plan of plans) {
      if (plan.fresh.length > 0) {
        // onConflictDoNothing: two ingestions running together must not fail
        // on the unique (source_path, content_hash) index.
        const inserted = await tx
          .insert(knowledgeChunks)
          .values(
            plan.fresh.map((fragment, index) => ({
              sourcePath: plan.sourcePath,
              heading: fragment.heading,
              content: fragment.content,
              contentHash: fragment.contentHash,
              embedding: embeddings[offset + index],
            })),
          )
          .onConflictDoNothing({
            target: [knowledgeChunks.sourcePath, knowledgeChunks.contentHash],
          })
          .returning({ id: knowledgeChunks.id });
        result.inserted += inserted.length;
        offset += plan.fresh.length;
      }

      if (plan.staleHashes.length > 0) {
        await tx
          .delete(knowledgeChunks)
          .where(
            and(
              eq(knowledgeChunks.sourcePath, plan.sourcePath),
              inArray(knowledgeChunks.contentHash, plan.staleHashes),
            ),
          );
        result.removed += plan.staleHashes.length;
      }

      result.unchanged += plan.unchanged;
    }

    if (dropMissingUnder && documents.length > 0) {
      const dropped = await tx
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
      result.removed += dropped.length;
    }
  });

  return result;
}

async function planDocument(db: Db, document: KnowledgeDocument): Promise<DocumentPlan> {
  // Identical fragments of one document share a hash and a single row.
  const fragments = [
    ...new Map(
      chunkMarkdown(document.markdown).map((fragment) => [fragment.contentHash, fragment]),
    ).values(),
  ];
  const wanted = new Set(fragments.map((fragment) => fragment.contentHash));

  const stored = await db
    .select({ contentHash: knowledgeChunks.contentHash })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.sourcePath, document.sourcePath));
  const storedHashes = new Set(stored.map((row) => row.contentHash));

  return {
    sourcePath: document.sourcePath,
    fresh: fragments.filter((fragment) => !storedHashes.has(fragment.contentHash)),
    unchanged: fragments.filter((fragment) => storedHashes.has(fragment.contentHash)).length,
    staleHashes: [...storedHashes].filter((hash) => !wanted.has(hash)),
  };
}

function embeddableText(fragment: KnowledgeFragment): string {
  return `${fragment.heading}\n\n${fragment.content}`;
}
