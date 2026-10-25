import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

import { diffMigrationHashes, type MigrationFile } from "./drift-core";

// Local-only on purpose: db:migrate:local hardcodes the same URL, while
// DIRECT_URL points at the cloud. The detector must never check or touch the
// remote database.
const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const DRIZZLE_DIR = fileURLToPath(new URL("../../drizzle/", import.meta.url));

type AppliedMigration = {
  hash: string;
  created_at: number;
};

async function readMigrationFiles(): Promise<MigrationFile[]> {
  const entries = await readdir(DRIZZLE_DIR);
  const names = entries.filter((entry) => entry.endsWith(".sql")).sort();

  return Promise.all(
    names.map(async (name) => ({
      name,
      hash: createHash("sha256")
        .update(await readFile(join(DRIZZLE_DIR, name)))
        .digest("hex"),
    })),
  );
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function printOrphans(applied: AppliedMigration[], orphan: string[]): void {
  const createdAt = new Map<string, number[]>();

  for (const row of applied) {
    const values = createdAt.get(row.hash) ?? [];
    values.push(row.created_at);
    createdAt.set(row.hash, values);
  }

  console.log("");
  console.log("Huérfanas (aplicadas en la base pero ausentes en drizzle/):");

  for (const hash of orphan) {
    const value = createdAt.get(hash)?.shift();
    console.log(`  - ${hash}${value === undefined ? "" : ` (created_at ${value})`}`);
  }
}

async function main(): Promise<void> {
  let files: MigrationFile[];

  try {
    files = await readMigrationFiles();
  } catch (error) {
    console.error(`[db:drift] No se pudieron leer las migraciones de ${DRIZZLE_DIR}.`);
    console.error(`           ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
    return;
  }

  if (files.length === 0) {
    console.error(`[db:drift] No hay migraciones .sql en ${DRIZZLE_DIR}.`);
    process.exitCode = 2;
    return;
  }

  const sql = postgres(LOCAL_DATABASE_URL, {
    max: 1,
    connect_timeout: 5,
    onnotice: () => {},
  });

  try {
    let applied: AppliedMigration[];
    let historyMissing = false;

    try {
      applied = await sql<AppliedMigration[]>`
        select hash, created_at from drizzle.__drizzle_migrations order by id
      `;
    } catch (error) {
      // A fresh database has no Drizzle history yet: every file is pending.
      // Anything else is a real failure and must exit 2, not masquerade as drift.
      if (errorCode(error) !== "42P01") {
        throw error;
      }

      applied = [];
      historyMissing = true;
    }

    const report = diffMigrationHashes(
      applied.map((row) => row.hash),
      files,
    );

    console.log(`[db:drift] Base local: ${LOCAL_DATABASE_URL}`);
    console.log(
      `[db:drift] Migraciones en la rama: ${files.length} · aplicadas en la base: ${applied.length}`,
    );

    if (historyMissing) {
      console.log("[db:drift] La base no tiene drizzle.__drizzle_migrations.");
    }

    if (report.aligned) {
      console.log("[db:drift] La base local está alineada con drizzle/ de la rama.");
      process.exitCode = 0;
      return;
    }

    if (report.pending.length > 0) {
      console.log("");
      console.log("Pendientes (en drizzle/ pero no aplicadas):");

      for (const file of report.pending) {
        console.log(`  - ${file.name} (${file.hash})`);
      }
    }

    if (report.orphan.length > 0) {
      printOrphans(applied, report.orphan);
    }

    console.log("");
    console.log(
      report.orphan.length > 0
        ? "→ Resetear la base local: bun run db:reset:local"
        : "→ Aplicar las migraciones: bun run db:migrate:local",
    );
    process.exitCode = 1;
  } catch (error) {
    const code = errorCode(error);
    console.error(`[db:drift] No se pudo verificar la base local${code ? ` (${code})` : ""}.`);
    console.error("           ¿Está levantado el stack? bun run supabase:start");
    process.exitCode = 2;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

await main();
