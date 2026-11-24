import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AppError } from "@/lib/errors/app-error";
import { HELP_CONTEXT_MAX_CHARS, buildHelpContext, lastUserQuestion } from "./sections";

const CONTENT_PATH = join(process.cwd(), "content", "ayuda");

// The base document: always sent, never truncated.
const BASE_FILE = "producto.md";

// The curated documents are optional by design. If one of them is missing in
// a deployment the assistant keeps answering with the base instead of failing
// the whole request; `corpus.test.ts` fails in CI when a file disappears.
const OPTIONAL_FILES = {
  glosario: "glosario-ayuda.md",
  navegacion: "navegacion-ayuda.md",
} as const;

// The base product text. Throws HELP_UNAVAILABLE when it cannot be read, so
// the route answers with a clear error instead of a prompt without knowledge.
export function readHelpCorpus(): string {
  try {
    return readFileSync(join(CONTENT_PATH, BASE_FILE), "utf8");
  } catch (cause) {
    throw new AppError("HELP_UNAVAILABLE", undefined, { cause });
  }
}

// The full documentary context for one request: the base document plus the
// sections that match the question, capped at HELP_CONTEXT_MAX_CHARS. The
// body is read as-is here and validated later by the request schema, so a
// malformed body only yields the base.
export function readHelpContext(raw: unknown): string {
  const base = readHelpCorpus();
  const question = lastUserQuestion(raw);
  if (!question.trim()) return base;

  return buildHelpContext(base, question, {
    glosario: readOptional(OPTIONAL_FILES.glosario),
    navegacion: readOptional(OPTIONAL_FILES.navegacion),
  });
}

export { HELP_CONTEXT_MAX_CHARS };

function readOptional(file: string): string {
  try {
    return readFileSync(join(CONTENT_PATH, file), "utf8");
  } catch {
    // The two curated documents are optional by design, so a missing file
    // never breaks the assistant. The warning keeps the degradation visible
    // in the server logs without leaking the question or any document text.
    console.warn(`[help] optional document unavailable: ${file}`);
    return "";
  }
}
