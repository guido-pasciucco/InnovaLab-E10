import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/**
 * Sube las variables de `.env.deploy` al proyecto de Vercel vinculado.
 *
 * El CLI de Vercel no lee archivos `.env` por su cuenta: este script es el
 * puente. Se corre una vez por entorno, o cada vez que cambie una credencial.
 *
 * Uso:
 *   bun scripts/deploy/env-sync.ts              # production
 *   bun scripts/deploy/env-sync.ts preview      # preview
 *
 * Nunca imprime valores: solo nombres y resultado.
 */

const ENV_FILE = ".env.deploy";
const LINK_FILE = ".vercel/project.json";

const REQUIRED = [
  "SITE_URL",
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

const OPTIONAL = ["DIRECT_URL"];

const KNOWN = [...REQUIRED, ...OPTIONAL];

function readEnvFile(path: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    values.set(key, value);
  }
  return values;
}

function describeProblem(key: string, value: string): string | null {
  if (!value) return "está vacía";
  if (/<[A-Za-z0-9_.-]+>/.test(value)) return "todavía tiene un placeholder (<...>)";
  if (/127\.0\.0\.1|localhost/.test(value)) return "apunta a una dirección local";
  if (key === "SITE_URL" && !value.startsWith("https://")) return "tiene que empezar con https://";
  if (key === "DATABASE_URL" && !/:6543(\/|\?|$)/.test(value)) {
    return "tiene que usar el puerto 6543 (transaction pooler)";
  }
  if (key === "DIRECT_URL" && !/:5432(\/|\?|$)/.test(value)) {
    return "tiene que usar el puerto 5432 (session pooler)";
  }
  return null;
}

function main(): void {
  const environment = process.argv[2] ?? "production";

  if (!["production", "preview", "development"].includes(environment)) {
    console.error(`Entorno inválido: ${environment}. Usá production, preview o development.`);
    process.exit(1);
  }

  if (!existsSync(ENV_FILE)) {
    console.error(
      `Falta ${ENV_FILE}. Copiá la plantilla y completá los valores:\n` +
        "  cp .env.deploy.example .env.deploy",
    );
    process.exit(1);
  }

  if (!existsSync(LINK_FILE)) {
    console.error(
      `No hay proyecto vinculado (falta ${LINK_FILE}).\n` +
        "Corré primero:  bunx vercel login && bunx vercel link",
    );
    process.exit(1);
  }

  const env = readEnvFile(ENV_FILE);
  const problems: string[] = [];
  const entries: Array<{ key: string; value: string }> = [];

  for (const key of KNOWN) {
    const value = env.get(key);
    if (value === undefined) {
      if (REQUIRED.includes(key)) problems.push(`${key}: falta en ${ENV_FILE}`);
      continue;
    }
    const problem = describeProblem(key, value);
    if (problem) problems.push(`${key}: ${problem}`);
    else entries.push({ key, value });
  }

  if (problems.length > 0) {
    console.error(`No se subió nada. Revisá ${ENV_FILE}:\n`);
    for (const problem of problems) console.error(`  ✗ ${problem}`);
    process.exit(1);
  }

  console.log(`Sincronizando ${entries.length} variable(s) al entorno "${environment}":\n`);

  let failures = 0;
  for (const { key, value } of entries) {
    const result = spawnSync(
      "bunx",
      ["vercel", "env", "add", key, environment, "--force", "--yes"],
      { input: `${value}\n`, encoding: "utf8" },
    );

    if (result.status === 0) {
      console.log(`  ✓ ${key}`);
      continue;
    }

    failures++;
    const detail = (result.stderr || result.stdout || "").trim().split("\n")[0];
    console.log(`  ✗ ${key}${detail ? ` — ${detail}` : ""}`);
  }

  if (failures > 0) {
    console.error(`\n${failures} variable(s) no se pudieron subir.`);
    process.exit(1);
  }

  console.log(`\nListo. Las variables quedaron guardadas en Vercel para "${environment}".`);
  console.log("Ya podés deployar con:  bun run deploy");
}

main();
