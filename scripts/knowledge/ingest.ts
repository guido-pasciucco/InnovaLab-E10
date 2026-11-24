import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { closeDb } from "@/lib/services/db";
import { createBedrockEmbedder } from "@/lib/services/knowledge-embeddings";
import { ingestKnowledgeDocumentsService } from "@/lib/services/knowledge-ingest";

// Loads docs/producto into knowledge_chunks.
//
//   bun run knowledge:ingest            # local database, reads .env.local
//   bun run knowledge:ingest -- --remote   # hosted database
//
// Re-running it only embeds fragments whose text changed. It does not print
// credentials. A hosted target requires --remote, same guard as the seed.

const SOURCE_DIR = "docs/producto";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("[knowledge] Missing DATABASE_URL.");
  assertLocalUnlessRemote(databaseUrl);

  const documents = await readDocuments();
  console.log(`[knowledge] ${documents.length} documents from ${SOURCE_DIR}.`);

  const result = await ingestKnowledgeDocumentsService(
    documents,
    createBedrockEmbedder(),
    undefined,
    `${SOURCE_DIR}/`,
  );
  console.log(
    `[knowledge] inserted ${result.inserted}, unchanged ${result.unchanged}, removed ${result.removed}.`,
  );
}

function assertLocalUnlessRemote(databaseUrl: string): void {
  const host = new URL(databaseUrl).hostname;
  console.log(`[knowledge] Target: ${host}`);
  if (!LOCAL_HOSTS.has(host) && !process.argv.includes("--remote")) {
    throw new Error(`[knowledge] ${host} is not local. Pass --remote to ingest there.`);
  }
}

async function readDocuments(): Promise<{ sourcePath: string; markdown: string }[]> {
  const directory = path.join(process.cwd(), SOURCE_DIR);
  const names = (await readdir(directory)).filter((name) => name.endsWith(".md")).sort();
  return Promise.all(
    names.map(async (name) => ({
      sourcePath: `${SOURCE_DIR}/${name}`,
      markdown: await readFile(path.join(directory, name), "utf8"),
    })),
  );
}

main()
  .catch((error: unknown) => {
    console.error("[knowledge] Ingest failed.", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
