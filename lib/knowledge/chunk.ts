import { createHash } from "node:crypto";

// Splits a Markdown document into the fragments stored in knowledge_chunks.
// Pure: no database and no network. The ingestion script feeds the result to
// the embedding client.
//
// Size is estimated as 1 token per 4 characters. This repo has no tokenizer;
// the estimate is only used to keep a fragment near 800 tokens. Titan reports
// the real token count when the embedding is requested.

export const KNOWLEDGE_CHUNK_TOKENS = 800;
export const KNOWLEDGE_CHUNK_OVERLAP_TOKENS = 100;
const CHARS_PER_TOKEN = 4;

export type KnowledgeFragment = {
  heading: string;
  content: string;
  contentHash: string;
};

type Section = { heading: string; body: string };

export function chunkMarkdown(markdown: string): KnowledgeFragment[] {
  return sectionsOf(markdown).flatMap((section) => splitSection(section));
}

export function knowledgeContentHash(heading: string, content: string): string {
  return createHash("sha256").update(`${heading}\n${content}`).digest("hex");
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function sectionsOf(markdown: string): Section[] {
  const stack: { level: number; title: string }[] = [];
  const sections: { heading: string; lines: string[] }[] = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop();
      stack.push({ level, title: heading[2].trim() });
      current = { heading: stack.map((item) => item.title).join(" > "), lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { heading: "Inicio", lines: [] };
      sections.push(current);
    }
    current.lines.push(line);
  }

  return sections
    .map((section) => ({ heading: section.heading, body: section.lines.join("\n").trim() }))
    .filter((section) => section.body.length > 0);
}

function splitSection(section: Section): KnowledgeFragment[] {
  if (estimateTokens(section.body) <= KNOWLEDGE_CHUNK_TOKENS) {
    return [toFragment(section.heading, section.body)];
  }

  const pieces: string[] = [];
  let current: string[] = [];

  for (const paragraph of section.body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)) {
    if (estimateTokens(paragraph) > KNOWLEDGE_CHUNK_TOKENS) {
      if (current.length > 0) {
        pieces.push(current.join("\n\n"));
        current = [];
      }
      pieces.push(...windowsOf(paragraph));
      continue;
    }
    const next = [...current, paragraph];
    if (current.length > 0 && estimateTokens(next.join("\n\n")) > KNOWLEDGE_CHUNK_TOKENS) {
      pieces.push(current.join("\n\n"));
      current = overlapTail(current);
    }
    current.push(paragraph);
  }
  if (current.length > 0) pieces.push(current.join("\n\n"));

  return pieces.map((content) => toFragment(section.heading, content));
}

// Keeps the tail of the previous fragment, so a sentence cut by the limit
// still appears in the next one. A single oversized paragraph is repeated
// whole when it is the only candidate.
function overlapTail(paragraphs: string[]): string[] {
  const tail: string[] = [];
  let tokens = 0;
  for (let index = paragraphs.length - 1; index >= 0; index -= 1) {
    const next = estimateTokens(paragraphs[index]);
    if (tail.length > 0 && tokens + next > KNOWLEDGE_CHUNK_OVERLAP_TOKENS) break;
    if (tail.length === 0 && next > KNOWLEDGE_CHUNK_TOKENS) break;
    tail.unshift(paragraphs[index]);
    tokens += next;
    if (tokens >= KNOWLEDGE_CHUNK_OVERLAP_TOKENS) break;
  }
  return tail;
}

function windowsOf(paragraph: string): string[] {
  const size = KNOWLEDGE_CHUNK_TOKENS * CHARS_PER_TOKEN;
  const overlap = KNOWLEDGE_CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;
  const windows: string[] = [];
  for (let start = 0; start < paragraph.length; start += size - overlap) {
    windows.push(paragraph.slice(start, start + size));
    if (start + size >= paragraph.length) break;
  }
  return windows;
}

function toFragment(heading: string, content: string): KnowledgeFragment {
  return { heading, content, contentHash: knowledgeContentHash(heading, content) };
}
