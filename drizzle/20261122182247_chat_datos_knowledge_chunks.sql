-- Knowledge base for the "Chateá con tus datos" agent (#279, stage 1).
--
-- Adds pgvector and `knowledge_chunks`: documentation fragments with their
-- embeddings, shared by every user (no owner column, no foreign keys). The
-- table is created empty; rows come from scripts/knowledge/ingest.ts, run
-- apart from the migration.
--
-- Inert until the feature is switched on: nothing in the app reads it yet.
--
-- To remove it later: DROP TABLE knowledge_chunks; DROP EXTENSION vector;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_path" text NOT NULL,
	"heading" text NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_chunks_source_hash_uq" ON "knowledge_chunks" USING btree ("source_path","content_hash");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_embedding_hnsw_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
-- Closed to the public Data API explicitly (see
-- 20261107231944_revoke-public-rest-api.sql): only the migrating role and
-- service_role reach this table. RLS above stays on as a second barrier.
REVOKE ALL ON TABLE "knowledge_chunks" FROM PUBLIC, "anon", "authenticated";
