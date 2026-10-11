import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as business from "./business/table";
import * as calculation from "./calculation/table";
import * as costs from "./costs/table";
import * as profile from "./profile/table";
import * as relations from "./relations";

// Runtime Drizzle client for Server Components, Server Actions and Route
// Handlers. Connects through DATABASE_URL, the Supabase transaction pooler
// (port 6543): it does not support prepared statements, so `prepare: false`
// is required. Migrations keep using DIRECT_URL (see drizzle.config.ts).
const schema = { ...profile, ...business, ...calculation, ...costs, ...relations };

function createDrizzleClient(url: string) {
  return drizzle(postgres(url, { prepare: false }), { schema });
}

export type Db = ReturnType<typeof createDrizzleClient>;

declare global {
  // Survives Next.js dev hot reloads so each edit does not open a new pool.
  var __drizzleClient: Db | undefined;
}

export function getDrizzleClient(): Db {
  if (globalThis.__drizzleClient) {
    return globalThis.__drizzleClient;
  }

  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("Missing DATABASE_URL environment variable");
  }

  globalThis.__drizzleClient = createDrizzleClient(url);
  return globalThis.__drizzleClient;
}
