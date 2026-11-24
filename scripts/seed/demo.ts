import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { VerifiedUserId } from "@/lib/services/auth";
import { addPeriodCostLineService } from "@/lib/services/business-cost";
import { closeDb } from "@/lib/services/db";
import { createPresentationService } from "@/lib/services/presentations";
import { createProductService } from "@/lib/services/products";
import { createSupplyService } from "@/lib/services/supplies";

// Seed for flow 1: one confirmed demo user with a small bakery catalog
// (supplies, packaging, products with their recipe and presentations) and the
// current month's period costs. It goes through the same services as the UI,
// so every row passes the app's own validation. `db:seed` reads `.env` (Bun
// loads it automatically); a non-local target requires the `--remote` flag.
//
// Re-running it deletes the demo user (cascading its data) and recreates it.
// No other user is touched.
//
//   bun run db:seed

const SEED_USER = {
  email: "demo@example.test",
  password: "User@1234",
  displayName: "Usuario Demo",
};

type SeedSupply = {
  kind: "supply" | "packaging";
  name: string;
  purchasePrice: string;
  purchaseQuantity: string;
  purchaseUnit: string;
};

// Catalog units only: the minimum unit and the factor come from the catalog.
const SUPPLIES: SeedSupply[] = [
  { kind: "supply", name: "Harina 000", purchasePrice: "18750", purchaseQuantity: "25", purchaseUnit: "kg" },
  { kind: "supply", name: "Azúcar", purchasePrice: "1800", purchaseQuantity: "1", purchaseUnit: "kg" },
  { kind: "supply", name: "Manteca", purchasePrice: "9500", purchaseQuantity: "1", purchaseUnit: "kg" },
  { kind: "supply", name: "Huevos", purchasePrice: "4200", purchaseQuantity: "1", purchaseUnit: "docena" },
  { kind: "supply", name: "Dulce de leche", purchasePrice: "6500", purchaseQuantity: "1", purchaseUnit: "kg" },
  { kind: "packaging", name: "Caja de cartón", purchasePrice: "15000", purchaseQuantity: "50", purchaseUnit: "unidad" },
  { kind: "packaging", name: "Bolsa kraft", purchasePrice: "8000", purchaseQuantity: "100", purchaseUnit: "unidad" },
  { kind: "packaging", name: "Etiqueta", purchasePrice: "2400", purchaseQuantity: "3", purchaseUnit: "docena" },
  { kind: "packaging", name: "Cinta", purchasePrice: "3000", purchaseQuantity: "10", purchaseUnit: "m" },
];

type Line = { supply: string; quantity: string; unit: string };

type SeedProduct = {
  name: string;
  monthlyCapacity: number;
  yieldQuantity: string;
  recipe: Line[];
  presentations: { name: string; unitsPerPresentation: string; packaging: Line[] }[];
};

const PRODUCTS: SeedProduct[] = [
  {
    name: "Alfajores de maicena",
    monthlyCapacity: 480,
    yieldQuantity: "24",
    recipe: [
      { supply: "Harina 000", quantity: "500", unit: "g" },
      { supply: "Azúcar", quantity: "200", unit: "g" },
      { supply: "Manteca", quantity: "250", unit: "g" },
      { supply: "Huevos", quantity: "3", unit: "unidad" },
      { supply: "Dulce de leche", quantity: "400", unit: "g" },
    ],
    presentations: [
      {
        name: "Unidad",
        unitsPerPresentation: "1",
        packaging: [{ supply: "Bolsa kraft", quantity: "1", unit: "unidad" }],
      },
      {
        name: "Caja x6",
        unitsPerPresentation: "6",
        packaging: [
          { supply: "Caja de cartón", quantity: "1", unit: "unidad" },
          { supply: "Etiqueta", quantity: "1", unit: "unidad" },
          { supply: "Cinta", quantity: "40", unit: "cm" },
        ],
      },
      {
        name: "Caja x12",
        unitsPerPresentation: "12",
        packaging: [
          { supply: "Caja de cartón", quantity: "1", unit: "unidad" },
          { supply: "Etiqueta", quantity: "2", unit: "unidad" },
          { supply: "Cinta", quantity: "60", unit: "cm" },
        ],
      },
    ],
  },
  {
    name: "Budín de vainilla",
    monthlyCapacity: 60,
    yieldQuantity: "1",
    recipe: [
      { supply: "Harina 000", quantity: "300", unit: "g" },
      { supply: "Azúcar", quantity: "250", unit: "g" },
      { supply: "Manteca", quantity: "200", unit: "g" },
      { supply: "Huevos", quantity: "4", unit: "unidad" },
    ],
    presentations: [
      {
        name: "Unidad",
        unitsPerPresentation: "1",
        packaging: [
          { supply: "Bolsa kraft", quantity: "1", unit: "unidad" },
          { supply: "Etiqueta", quantity: "1", unit: "unidad" },
        ],
      },
    ],
  },
];

const PERIOD_COSTS = [
  { concept: "Alquiler del local", amountPeriod: "120000" },
  { concept: "Luz y gas", amountPeriod: "35000" },
  { concept: "Internet", amountPeriod: "12000" },
];

const REQUIRED_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "DATABASE_URL"] as const;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

type Env = Record<(typeof REQUIRED_KEYS)[number], string>;

function readEnv(): Env {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) throw new Error(`[seed] Missing env vars: ${missing.join(", ")}`);
  return Object.fromEntries(REQUIRED_KEYS.map((key) => [key, process.env[key]!])) as Env;
}

// Refuses a hosted target unless `--remote` was passed, so a stray run
// against production cannot happen by accident.
function assertTarget(env: Env): void {
  const hosts = [env.NEXT_PUBLIC_SUPABASE_URL, env.DATABASE_URL].map((url) => new URL(url).hostname);
  const remote = hosts.filter((host) => !LOCAL_HOSTS.has(host));
  console.log(`[seed] Target: ${[...new Set(hosts)].join(", ")}`);
  if (remote.length > 0 && !process.argv.includes("--remote")) {
    throw new Error(`[seed] ${remote.join(", ")} is not local. Pass --remote to seed it.`);
  }
}

// Supabase Admin API (secret key): bypasses RLS and manages auth users.
function adminClient(env: Env): SupabaseClient {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// The Admin API has no email filter, so this pages through the user list.
async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | undefined> {
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`[seed] listUsers failed: ${error.message}`);
    const match = data.users.find((user) => user.email === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < perPage) return undefined;
  }
}

// Deletes the profile row too: `public.profiles` has no FK to `auth.users`.
// The profile cascades to the business, its products and the supplies.
async function deleteUser(admin: SupabaseClient, id: string): Promise<void> {
  const { error: profileError } = await admin.from("profiles").delete().eq("id", id);
  if (profileError) throw new Error(`[seed] deleting profile ${id} failed: ${profileError.message}`);
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error && error.status !== 404) throw new Error(`[seed] deleteUser ${id} failed: ${error.message}`);
}

// Confirmed user; the `on_auth_user_created` trigger inserts its profile.
// The seed creates the account itself through the Admin API, so its id is the
// verified owner for the services it calls next.
async function createUser(admin: SupabaseClient): Promise<VerifiedUserId> {
  const { data, error } = await admin.auth.admin.createUser({
    email: SEED_USER.email,
    password: SEED_USER.password,
    email_confirm: true,
    user_metadata: { display_name: SEED_USER.displayName },
  });
  if (error || !data.user) throw new Error(`[seed] createUser failed: ${error?.message ?? "no user"}`);
  return data.user.id as VerifiedUserId;
}

async function seed(): Promise<void> {
  const env = readEnv();
  assertTarget(env);
  const admin = adminClient(env);

  try {
    const existingId = await findUserIdByEmail(admin, SEED_USER.email);
    if (existingId) await deleteUser(admin, existingId);

    const userId = await createUser(admin);

    const supplyIds = new Map<string, string>();
    for (const supply of SUPPLIES) {
      const row = await createSupplyService(userId, supply);
      supplyIds.set(supply.name, row.id);
    }

    const toLines = (lines: Line[]) =>
      lines.map(({ supply, quantity, unit }) => {
        const supplyId = supplyIds.get(supply);
        if (!supplyId) throw new Error(`[seed] Unknown supply "${supply}"`);
        return { supplyId, quantity, unit };
      });

    for (const product of PRODUCTS) {
      const created = await createProductService(userId, {
        name: product.name,
        monthlyCapacity: product.monthlyCapacity,
        yieldQuantity: product.yieldQuantity,
        recipe: toLines(product.recipe),
      });
      for (const presentation of product.presentations) {
        await createPresentationService(userId, created.id, {
          ...presentation,
          packaging: toLines(presentation.packaging),
        });
      }
    }

    for (const line of PERIOD_COSTS) await addPeriodCostLineService(userId, line);

    console.log(
      `Seeded ${SEED_USER.email}: ${SUPPLIES.length} supplies and packaging, ` +
        `${PRODUCTS.length} products, ${PERIOD_COSTS.length} period costs.`,
    );
  } finally {
    await closeDb();
  }
}

await seed();
