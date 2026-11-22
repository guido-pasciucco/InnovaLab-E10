import { eq, like } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { KNOWLEDGE_EMBEDDING_DIMENSIONS, knowledgeChunks } from "@/lib/db/knowledge/table";

import { loadTestEnv } from "../../tests/support/test-env";
import { ingestKnowledgeDocumentsService } from "./knowledge-ingest";
import { searchKnowledgeService } from "./knowledge-search";
import type { EmbedTexts } from "./knowledge-embeddings";

// Integration against local Postgres. The embedder is a fake: no test in this
// file calls Bedrock.

let db: Db;
const prefix = `docs/producto/test-${crypto.randomUUID()}/`;

beforeAll(() => {
  process.env.DATABASE_URL = loadTestEnv().DATABASE_URL;
  db = getDrizzleClient();
});

afterEach(async () => {
  await db.delete(knowledgeChunks).where(like(knowledgeChunks.sourcePath, `${prefix}%`));
});

afterAll(async () => {
  await db.$client.end();
});

function vector(slot: number): number[] {
  return Array.from({ length: KNOWLEDGE_EMBEDDING_DIMENSIONS }, (_, index) => (index === slot ? 1 : 0));
}

describe("ingestKnowledgeDocumentsService", () => {
  it("embeds a fragment once and skips it on the next run", async () => {
    const seen: string[][] = [];
    const embedTexts: EmbedTexts = async (values) => {
      seen.push(values);
      return values.map(() => vector(0));
    };
    const document = {
      sourcePath: `${prefix}definiciones.md`,
      markdown: "# Definiciones\n\nUn renglón de costo.\n",
    };

    const first = await ingestKnowledgeDocumentsService([document], embedTexts, db);
    const second = await ingestKnowledgeDocumentsService([document], embedTexts, db);

    expect(first).toEqual({ inserted: 1, unchanged: 0, removed: 0 });
    expect(second).toEqual({ inserted: 0, unchanged: 1, removed: 0 });
    expect(seen).toHaveLength(1);
  });

  it("replaces a fragment when its text changes and drops a removed document", async () => {
    const embedTexts: EmbedTexts = async (values) => values.map(() => vector(1));
    const kept = { sourcePath: `${prefix}a.md`, markdown: "# A\n\nTexto inicial.\n" };
    const dropped = { sourcePath: `${prefix}b.md`, markdown: "# B\n\nOtro texto.\n" };
    await ingestKnowledgeDocumentsService([kept, dropped], embedTexts, db);

    const result = await ingestKnowledgeDocumentsService(
      [{ ...kept, markdown: "# A\n\nTexto nuevo.\n" }],
      embedTexts,
      db,
      prefix,
    );

    const rows = await db
      .select({ content: knowledgeChunks.content })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.sourcePath, kept.sourcePath));
    const droppedRows = await db
      .select({ id: knowledgeChunks.id })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.sourcePath, dropped.sourcePath));
    expect(result.inserted).toBe(1);
    expect(result.removed).toBe(2);
    expect(rows.map((row) => row.content)).toEqual(["Texto nuevo."]);
    expect(droppedRows).toHaveLength(0);
  });
});

describe("searchKnowledgeService", () => {
  it("returns the closest fragment with its source and heading", async () => {
    const embedTexts: EmbedTexts = async (values) => values.map(() => vector(3));
    await ingestKnowledgeDocumentsService(
      [
        { sourcePath: `${prefix}lejos.md`, markdown: "# Lejos\n\nEste fragmento queda lejos.\n" },
        { sourcePath: `${prefix}cerca.md`, markdown: "# Cerca\n\nEste fragmento es el cercano.\n" },
      ],
      async (values) => values.map((value) => vector(value.includes("cerca") ? 3 : 4)),
      db,
    );

    const hits = await searchKnowledgeService("equilibrio", embedTexts, db);

    expect(hits[0]).toEqual({
      sourcePath: `${prefix}cerca.md`,
      heading: "Cerca",
      content: "Este fragmento es el cercano.",
    });
  });
});
