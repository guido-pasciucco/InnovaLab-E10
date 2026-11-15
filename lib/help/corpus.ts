import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AppError } from "@/lib/errors/app-error";

const CORPUS_PATH = join(process.cwd(), "content", "ayuda", "producto.md");

export function readHelpCorpus(): string {
  try {
    return readFileSync(CORPUS_PATH, "utf8");
  } catch (cause) {
    throw new AppError("HELP_UNAVAILABLE", undefined, { cause });
  }
}
