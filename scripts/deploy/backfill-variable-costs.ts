/**
 * Operational, resumable backfill for persisted current variable costs.
 *
 * This command makes no change unless `--execute` is explicit. It processes
 * one page by default, prints a cursor safe to copy into the next invocation,
 * and never creates a default yield for historical products.
 *
 * Examples:
 *   DIRECT_URL=... bun run deploy:backfill-variable-costs -- --execute
 *   DIRECT_URL=... bun run deploy:backfill-variable-costs -- --execute --after-product-id <cursor>
 *   DIRECT_URL=... bun run deploy:backfill-variable-costs -- --execute --max-batches 20
 */
// eslint-disable-next-line no-restricted-imports -- deploy script needs a schema-aware Drizzle client
import { getDrizzleClient } from "@/lib/db/client";
import { backfillProductVariableCosts } from "@/lib/services/product-variable-cost-backfill";

type Arguments = {
  execute: boolean;
  batchSize: number;
  maxBatches: number;
  afterProductId?: string;
  businessId?: string;
};

function positiveInteger(flag: string, value: string | undefined, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`${flag} must be an integer between 1 and ${maximum}.`);
  }
  return parsed;
}

function parseArguments(argv: string[]): Arguments {
  const values = new Map<string, string>();
  let execute = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--execute") {
      execute = true;
      continue;
    }
    if (!["--batch-size", "--max-batches", "--after-product-id", "--business-id"].includes(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
    values.set(argument, value);
    index += 1;
  }

  return {
    execute,
    batchSize: positiveInteger("--batch-size", values.get("--batch-size") ?? "50", 200),
    // A bounded default makes interruption and resumption explicit in deploys.
    maxBatches: positiveInteger("--max-batches", values.get("--max-batches") ?? "1", 10_000),
    afterProductId: values.get("--after-product-id"),
    businessId: values.get("--business-id"),
  };
}

function targetLabel(url: string): string {
  const target = new URL(url);
  return `${target.host}${target.pathname}`;
}

const options = parseArguments(process.argv.slice(2));
const databaseUrl = process.env.DIRECT_URL;

if (!databaseUrl) {
  throw new Error("DIRECT_URL is required; use the direct deploy connection, never an application URL.");
}
if (!options.execute) {
  throw new Error("Refusing to modify data without --execute. The command is otherwise a no-op.");
}

// Services use DATABASE_URL. This process is started only by the explicit
// deployment command, so it is safe to map the direct connection locally.
process.env.DATABASE_URL = databaseUrl;
const db = getDrizzleClient();

let cursor = options.afterProductId;
let processed = 0;

console.log(
  JSON.stringify({
    event: "variable_cost_backfill_started",
    target: targetLabel(databaseUrl),
    batchSize: options.batchSize,
    maxBatches: options.maxBatches,
    afterProductId: cursor ?? null,
    businessId: options.businessId ?? null,
  }),
);

try {
  for (let batch = 1; batch <= options.maxBatches; batch += 1) {
    const result = await backfillProductVariableCosts(
      {
        batchSize: options.batchSize,
        afterProductId: cursor,
        businessId: options.businessId,
      },
      db,
    );
    processed += result.processed;
    cursor = result.nextAfterProductId ?? undefined;

    console.log(
      JSON.stringify({
        event: "variable_cost_backfill_batch",
        batch,
        processed: result.processed,
        totalProcessed: processed,
        nextAfterProductId: result.nextAfterProductId,
      }),
    );

    if (!result.nextAfterProductId) break;
  }

  console.log(
    JSON.stringify({
      event: "variable_cost_backfill_finished",
      totalProcessed: processed,
      nextAfterProductId: cursor ?? null,
      resumeCommand: cursor
        ? `bun run deploy:backfill-variable-costs -- --execute --after-product-id ${cursor}`
        : null,
    }),
  );
} finally {
  await db.$client.end();
  globalThis.__drizzleClient = undefined;
}
