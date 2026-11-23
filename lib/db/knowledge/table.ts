import { index, pgTable, text, timestamp, uniqueIndex, uuid, vector } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Knowledge base for the "Chateá con tus datos" agent (#279, stage 1).
// Documents are global: there is no owner column and no foreign key, so the
// table never depends on user data. Consumed only by lib/services through
// getDrizzleClient(); the agent reads it through the search service.
//
// Rows are produced by the ingestion script (scripts/knowledge/ingest.ts),
// never by the app at request time. Changing the embedding model requires
// re-ingesting every row.
// ---------------------------------------------------------------------------

// Amazon Titan Text Embeddings V2 is called with 1024 dimensions. The
// ingestion and search services validate this length before touching the DB.
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 1024;

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Repo-relative path of the document, e.g. "docs/producto/03-definiciones.md".
    sourcePath: text("source_path").notNull(),
    // Heading breadcrumb of the section, e.g. "Motor de cálculo > Punto de equilibrio".
    heading: text("heading").notNull(),
    content: text("content").notNull(),
    // SHA-256 of heading + content: lets ingestion skip unchanged chunks.
    contentHash: text("content_hash").notNull(),
    embedding: vector("embedding", { dimensions: KNOWLEDGE_EMBEDDING_DIMENSIONS }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One row per distinct chunk of a document; also the idempotency key.
    uniqueIndex("knowledge_chunks_source_hash_uq").on(table.sourcePath, table.contentHash),
    // Approximate nearest neighbour search by cosine distance.
    index("knowledge_chunks_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
  // Same passive defense as the rest of the schema: RLS on, no policies, so
  // neither anon nor authenticated can read it even if a grant slips in.
).enableRLS();

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeChunks.$inferInsert;
