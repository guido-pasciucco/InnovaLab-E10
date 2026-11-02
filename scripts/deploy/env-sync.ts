import { spawnSync } from "node:child_process";
import { lookup } from "node:dns/promises";
import { existsSync, readFileSync } from "node:fs";
import { connect } from "node:net";

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
 * Antes de subir valida cada valor: placeholders, direcciones locales, puertos
 * de pooler, y que los hosts de base existan y acepten conexiones.
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

const SUPABASE_POOLER = "pooler.supabase.com";
const SUPABASE_DIRECT = /^db\.[a-z0-9]+\.supabase\.co$/;

/**
 * Supabase tiene dos hosts distintos y no intercambiables: el pooler
 * (`<region>.pooler.supabase.com`) y la conexión directa
 * (`db.<ref>.supabase.co`). Un host inventado con el puerto correcto pasa
 * cualquier chequeo de puerto y falla recién al conectar.
 */
function checkSupabaseHost(key: string, hostname: string): string | null {
  const isPooler = hostname.endsWith(`.${SUPABASE_POOLER}`);
  const isDirect = SUPABASE_DIRECT.test(hostname);

  if (key === "DATABASE_URL" && !isPooler) {
    return `el host "${hostname}" no es un pooler de Supabase (esperado: <region>.${SUPABASE_POOLER})`;
  }
  if (key === "DIRECT_URL" && !isPooler && !isDirect) {
    return `el host "${hostname}" no es de Supabase (esperado: <region>.${SUPABASE_POOLER} o db.<ref>.supabase.co)`;
  }
  return null;
}

/** Comprueba que el host exista y acepte conexiones en ese puerto. */
async function checkReachable(hostname: string, port: number): Promise<string | null> {
  try {
    await lookup(hostname);
  } catch {
    return `el host "${hostname}" no resuelve por DNS: revisá la región del pooler`;
  }

  return new Promise((resolve) => {
    const socket = connect({ host: hostname, port });
    const finish = (problem: string | null) => {
      socket.destroy();
      resolve(problem);
    };

    socket.setTimeout(8000);
    socket.once("connect", () => finish(null));
    socket.once("timeout", () => finish(`"${hostname}:${port}" no responde (timeout)`));
    socket.once("error", (error: NodeJS.ErrnoException) =>
      finish(`"${hostname}:${port}" no acepta conexiones (${error.code ?? error.message})`),
    );
  });
}

async function checkConnectionUrl(key: string, value: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "no es una URL válida";
  }

  const hostProblem = checkSupabaseHost(key, url.hostname);
  if (hostProblem) return hostProblem;

  return checkReachable(url.hostname, url.port ? Number(url.port) : 5432);
}

async function main(): Promise<void> {
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
    if (problem) {
      problems.push(`${key}: ${problem}`);
      continue;
    }

    if (key === "DATABASE_URL" || key === "DIRECT_URL") {
      const hostProblem = await checkConnectionUrl(key, value);
      if (hostProblem) {
        problems.push(`${key}: ${hostProblem}`);
        continue;
      }
    }

    entries.push({ key, value });
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
      { input: `${value}\n`, encoding: "utf8", timeout: 120_000 },
    );

    if (result.status === 0) {
      console.log(`  ✓ ${key}`);
      continue;
    }

    failures++;
    const detail =
      result.error?.message ??
      (result.signal ? `abortado por ${result.signal} (timeout)` : undefined) ??
      (result.stderr || result.stdout || "").trim().split("\n")[0];
    console.log(`  ✗ ${key}${detail ? ` — ${detail}` : ""}`);
  }

  if (failures > 0) {
    console.error(`\n${failures} variable(s) no se pudieron subir.`);
    process.exit(1);
  }

  console.log(`\nListo. Las variables quedaron guardadas en Vercel para "${environment}".`);
  console.log("Ya podés deployar con:  bun run deploy");
}

await main();
