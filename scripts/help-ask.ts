import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBedrockHelpModel } from "../lib/help/bedrock";
import { readHelpConfig } from "../lib/help/config";
import { readHelpCorpus } from "../lib/help/corpus";
import { HELP_THREAD_LIMIT, type HelpMessage } from "../lib/schemas/help/help";
import { streamHelpReply } from "../lib/services/help";

const threadPath = join(tmpdir(), "innovalab-e10-help-thread.json");

function readThread(): HelpMessage[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(threadPath, "utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is HelpMessage =>
        !!item &&
        typeof item === "object" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string",
    );
  } catch {
    return [];
  }
}

const args = process.argv.slice(2);
if (args.includes("--reset")) {
  writeFileSync(threadPath, "[]");
  console.log("Hilo borrado.");
}

const question = args.filter((arg) => arg !== "--reset").join(" ").trim();
if (!question) {
  console.error('Uso: bun --conditions=react-server scripts/help-ask.ts "¿Qué es el margen?"');
  process.exit(1);
}

const config = readHelpConfig();
if (!config) {
  console.error(
    "El asistente está apagado. Hacen falta HELP_ENABLED=true y el ARN de un perfil de inferencia en HELP_MODEL.",
  );
  process.exit(1);
}

const messages = [...readThread(), { role: "user" as const, content: question }].slice(-HELP_THREAD_LIMIT);
const stream = streamHelpReply({ messages }, createBedrockHelpModel(config), readHelpCorpus());

async function main(): Promise<void> {
  let answer = "";
  for await (const chunk of stream.textStream) {
    answer += chunk;
    process.stdout.write(chunk);
  }
  process.stdout.write("\n");

  const usage = await stream.usage;
  console.info("[help] tokens", usage);
  writeFileSync(
    threadPath,
    JSON.stringify([...messages, { role: "assistant", content: answer }].slice(-HELP_THREAD_LIMIT)),
  );
}

await main();
