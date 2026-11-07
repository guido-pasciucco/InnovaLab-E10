import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getDrizzleClient } from "@/lib/db/client";
import { createCalculationService } from "@/lib/services/calculations";
import {
  advanceCalculatorProgressService,
  saveCalculatorSetupService,
} from "@/lib/services/calculator";
import { addCalcCostLineService, addVariableCalcCostLineService } from "@/lib/services/cost";
import { addIndirectCalcCostLineService, saveOwnLaborService } from "@/lib/services/own-labor";
import { saveExpectedMarginService } from "@/lib/services/pricing";
import {
  duplicateScenarioService,
  getScenarioComparisonService,
  updateScenarioService,
} from "@/lib/services/scenarios";

// Seed: one confirmed user with a few finished cost calculations.
// It goes through the same services the wizard uses, so every row passes the
// app's own validation and lands where the UI expects it. `db:seed` reads
// `.env` (Bun loads it automatically); `deploy:seed` reads `.env.deploy`
// through `--env-file`. A non-local target requires the `--remote` flag,
// which only `deploy:seed` passes.
//
// Re-running it deletes the seed user (cascading its calculations) and
// recreates it. No other user is touched.
//
//   bun run db:seed       # local Supabase, from .env
//   bun run deploy:seed   # hosted project, from .env.deploy

const SEED_USER = {
  email: "demo@example.test",
  password: "User@1234",
  displayName: "Usuario Demo",
};

// Wizard step the seeded calculations are left on (summary, the last one).
const SEED_STEP = 8;

type SeedCalculation = {
  setup: { name: string; unit: string; volume: number; currency: string; period: string };
  fixed: { concept: string; amount: string }[];
  variable: { concept: string; amount: string; yieldQuantity: string }[];
  ownLabor: { hours: string; hourlyRate: string };
  indirect: { concept: string; amount: string }[];
  expectedMarginPct: string;
  // Step 7 alternatives next to the base (at most MAX_SCENARIOS - 1). Null
  // keeps the base value.
  scenarios: { name: string; priceOverride: string | null; volumeOverride: number | null }[];
};

const CALCULATIONS: SeedCalculation[] = [
  {
    setup: { name: "Medias de algodón", unit: "docena", volume: 100, currency: "ARS", period: "Mensual" },
    fixed: [{ concept: "Alquiler del taller", amount: "50000" }],
    variable: [
      { concept: "Hilado de algodón", amount: "30000", yieldQuantity: "10" },
      { concept: "Etiquetas y bolsas", amount: "5000", yieldQuantity: "50" },
    ],
    ownLabor: { hours: "80", hourlyRate: "2500" },
    indirect: [{ concept: "Luz y gas", amount: "18000" }],
    expectedMarginPct: "25",
    scenarios: [
      { name: "Subir el precio", priceOverride: "9000", volumeOverride: null },
      { name: "Vender más docenas", priceOverride: null, volumeOverride: 150 },
    ],
  },
  {
    setup: { name: "Velas de soja", unit: "caja", volume: 40, currency: "ARS", period: "Mensual" },
    fixed: [
      { concept: "Monotributo", amount: "32000" },
      { concept: "Publicidad en redes", amount: "15000" },
    ],
    variable: [
      { concept: "Cera de soja 5 kg", amount: "42000", yieldQuantity: "8" },
      { concept: "Esencias", amount: "12000", yieldQuantity: "20" },
      { concept: "Packaging", amount: "9000", yieldQuantity: "30" },
    ],
    ownLabor: { hours: "40", hourlyRate: "3000" },
    indirect: [{ concept: "Internet", amount: "12000" }],
    expectedMarginPct: "35",
    scenarios: [
      { name: "Precio competitivo", priceOverride: "14000", volumeOverride: null },
      { name: "Duplicar producción", priceOverride: null, volumeOverride: 80 },
    ],
  },
  {
    setup: { name: "Budines artesanales", unit: "unidad", volume: 250, currency: "ARS", period: "Mensual" },
    fixed: [{ concept: "Habilitación bromatológica", amount: "20000" }],
    variable: [
      { concept: "Harina 25 kg", amount: "28000", yieldQuantity: "60" },
      { concept: "Huevos (maple de 30)", amount: "7500", yieldQuantity: "10" },
      { concept: "Manteca y azúcar", amount: "16000", yieldQuantity: "25" },
    ],
    ownLabor: { hours: "60", hourlyRate: "2800" },
    indirect: [{ concept: "Gas del horno", amount: "22000" }],
    expectedMarginPct: "30",
    scenarios: [{ name: "Precio de feria", priceOverride: "3500", volumeOverride: 300 }],
  },
];

const REQUIRED_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "DATABASE_URL"] as const;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function readEnv(): Record<(typeof REQUIRED_KEYS)[number], string> {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) throw new Error(`[seed] Missing env vars: ${missing.join(", ")}`);
  return Object.fromEntries(REQUIRED_KEYS.map((key) => [key, process.env[key]!])) as Record<
    (typeof REQUIRED_KEYS)[number],
    string
  >;
}

// Refuses a hosted target unless `--remote` was passed, so a stray run
// against production cannot happen by accident.
function assertTarget(env: ReturnType<typeof readEnv>): void {
  const hosts = [env.NEXT_PUBLIC_SUPABASE_URL, env.DATABASE_URL].map((url) => new URL(url).hostname);
  const remote = hosts.filter((host) => !LOCAL_HOSTS.has(host));
  console.log(`[seed] Target: ${[...new Set(hosts)].join(", ")}`);
  if (remote.length > 0 && !process.argv.includes("--remote")) {
    throw new Error(`[seed] ${remote.join(", ")} is not local. Use \`bun run deploy:seed\` to seed it.`);
  }
}

// Supabase Admin API (secret key): bypasses RLS and manages auth users.
function adminClient(env: ReturnType<typeof readEnv>): SupabaseClient {
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
async function deleteUser(admin: SupabaseClient, id: string): Promise<void> {
  const { error: profileError } = await admin.from("profiles").delete().eq("id", id);
  if (profileError) throw new Error(`[seed] deleting profile ${id} failed: ${profileError.message}`);
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error && error.status !== 404) throw new Error(`[seed] deleteUser ${id} failed: ${error.message}`);
}

// Confirmed user; the `on_auth_user_created` trigger inserts its profile.
async function createUser(admin: SupabaseClient): Promise<{ id: string }> {
  const { data, error } = await admin.auth.admin.createUser({
    email: SEED_USER.email,
    password: SEED_USER.password,
    email_confirm: true,
    user_metadata: { display_name: SEED_USER.displayName },
  });
  if (error || !data.user) throw new Error(`[seed] createUser failed: ${error?.message ?? "no user"}`);
  return { id: data.user.id };
}

async function seed(): Promise<void> {
  const env = readEnv();
  assertTarget(env);
  const admin = adminClient(env);
  const db = getDrizzleClient();

  try {
    const existingId = await findUserIdByEmail(admin, SEED_USER.email);
    if (existingId) await deleteUser(admin, existingId);

    const user = await createUser(admin);

    for (const calc of CALCULATIONS) {
      await createCalculationService(user.id, db);
      await saveCalculatorSetupService(user.id, calc.setup, db);
      for (const line of calc.fixed) await addCalcCostLineService(user.id, line, db);
      for (const line of calc.variable) await addVariableCalcCostLineService(user.id, line, db);
      await saveOwnLaborService(user.id, calc.ownLabor, db);
      for (const line of calc.indirect) await addIndirectCalcCostLineService(user.id, line, db);
      await saveExpectedMarginService(user.id, { expectedMarginPct: calc.expectedMarginPct }, db);

      // Opening step 7 creates the base scenario; alternatives are copies of
      // it with their own overrides, as the "Duplicar" button does.
      const { scenarios } = await getScenarioComparisonService(user.id, db);
      const base = scenarios.find((scenario) => scenario.isBase);
      if (!base) throw new Error(`[seed] No base scenario for "${calc.setup.name}"`);
      for (const alternative of calc.scenarios) {
        const copy = await duplicateScenarioService(user.id, base.id, db);
        await updateScenarioService(user.id, { scenarioId: copy.id, ...alternative }, db);
      }

      await advanceCalculatorProgressService(user.id, SEED_STEP, db);
    }

    console.log(`Seeded ${SEED_USER.email} with ${CALCULATIONS.length} calculations.`);
  } finally {
    await db.$client.end();
  }
}

await seed();
