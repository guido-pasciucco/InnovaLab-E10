import { describe, expect, it } from "vitest";

import { chunkMarkdown, KNOWLEDGE_CHUNK_TOKENS, knowledgeContentHash } from "./chunk";

describe("chunkMarkdown", () => {
  it("returns one fragment per heading with its breadcrumb", () => {
    const fragments = chunkMarkdown("# Motor\n\nTexto del motor.\n\n## Equilibrio\n\nTexto del equilibrio.\n");

    expect(fragments.map((fragment) => fragment.heading)).toEqual(["Motor", "Motor > Equilibrio"]);
    expect(fragments[0].content).toBe("Texto del motor.");
    expect(fragments[1].content).toBe("Texto del equilibrio.");
  });

  it("keeps the same hash when the heading and the text do not change", () => {
    const [fragment] = chunkMarkdown("# Definiciones\n\nUn renglón de costo.\n");

    expect(fragment.contentHash).toBe(knowledgeContentHash("Definiciones", "Un renglón de costo."));
  });

  it("drops a heading that has no text", () => {
    const fragments = chunkMarkdown("# Vacío\n\n# Con texto\n\nHay contenido.\n");

    expect(fragments).toHaveLength(1);
    expect(fragments[0].heading).toBe("Con texto");
  });

  it("repeats the tail of a long section in the next fragment", () => {
    const paragraph = "palabra ".repeat(200).trim();
    const markdown = `# Largo\n\n${paragraph}\n\n${paragraph}\n\n${paragraph}\n`;

    const fragments = chunkMarkdown(markdown);

    expect(fragments.length).toBeGreaterThan(1);
    expect(fragments.every((fragment) => fragment.heading === "Largo")).toBe(true);
    expect(fragments[1].content.startsWith(paragraph)).toBe(true);
    for (const fragment of fragments) {
      expect(fragment.content.length / 4).toBeLessThanOrEqual(KNOWLEDGE_CHUNK_TOKENS + paragraph.length / 4);
    }
  });
});
