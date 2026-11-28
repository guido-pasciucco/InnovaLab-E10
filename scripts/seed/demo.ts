import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { VerifiedUserId } from "@/lib/services/auth";
import { addPeriodCostLineService } from "@/lib/services/business-cost";
import { closeDb } from "@/lib/services/db";
import { createPresentationService } from "@/lib/services/presentations";
import { createProductService } from "@/lib/services/products";
import { cuitCheckDigit } from "@/lib/schemas/suppliers/cuit";
import {
  acceptSupplierInviteService,
  createSupplierInviteService,
  registerSupplierService,
} from "@/lib/services/suppliers";
import { createSupplyService } from "@/lib/services/supplies";

// Seed for QA flows: three emprendedor accounts with the bakery catalog
// (supplies, packaging, products with their recipe and presentations and
// period costs) and three supplier accounts, each linked to every
// emprendedor (9 supplier_links). It goes through the same services as the
// UI, so every row passes the app's own validation. `db:seed` reads `.env`
// (Bun loads it automatically); a non-local target requires `--remote`.
//
// Re-running it deletes the seeded users (cascading their data) and
// recreates them, plus the legacy demo@example.test account. No other user
// is touched.
//
//   bun run db:seed

const SEED_PASSWORD = "User@1234";

const EMPRENDEDORES = [
  { email: "emprendedor1@example.test", displayName: "Emprendedor Uno" },
  { email: "emprendedor2@example.test", displayName: "Emprendedor Dos" },
  { email: "emprendedor3@example.test", displayName: "Emprendedor Tres" },
] as const;

// First 10 CUIT digits (2-digit type + 8-digit number); the check digit is
// computed with the app's own rule so every CUIT passes cuitField.
const PROVEEDORES = [
  {
    email: "proveedor1@example.test",
    displayName: "Distribuidora Andina",
    businessName: "Distribuidora Andina SRL",
    cuitBase: "3071234567",
    contactName: "Carla Andina",
    phone: "+54 11 4000-0001",
    categories: "Harinas, Cereales",
  },
  {
    email: "proveedor2@example.test",
    displayName: "Lácteos del Valle",
    businessName: "Lácteos del Valle SA",
    cuitBase: "3377654321",
    contactName: "Martín Valle",
    phone: "+54 11 4000-0002",
    categories: "Lácteos, Huevos",
  },
  {
    email: "proveedor3@example.test",
    displayName: "Insumos Packaging",
    businessName: "Insumos Packaging SRL",
    cuitBase: "3078899001",
    contactName: "Lucía Prado",
    phone: "+54 11 4000-0003",
    categories: "Packaging, Etiquetado",
  },
] as const;

// Accounts from earlier seeds that are no longer created; deleted on run.
const LEGACY_EMAILS = ["demo@example.test"];

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
// The profile cascades to the business, its products, the supplies, the
// supplier row and every link and invite that touches the account.
async function deleteUser(admin: SupabaseClient, id: string): Promise<void> {
  const { error: profileError } = await admin.from("profiles").delete().eq("id", id);
  if (profileError) throw new Error(`[seed] deleting profile ${id} failed: ${profileError.message}`);
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error && error.status !== 404) throw new Error(`[seed] deleteUser ${id} failed: ${error.message}`);
}

async function deleteSeedUser(admin: SupabaseClient, email: string): Promise<void> {
  const existingId = await findUserIdByEmail(admin, email);
  if (existingId) await deleteUser(admin, existingId);
}

// Confirmed user; the `on_auth_user_created` trigger inserts its profile.
// The seed creates the account itself through the Admin API, so its id is the
// verified owner for the services it calls next.
async function createUser(admin: SupabaseClient, email: string, displayName: string): Promise<VerifiedUserId> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw new Error(`[seed] createUser ${email} failed: ${error?.message ?? "no user"}`);
  return data.user.id as VerifiedUserId;
}

// The bakery catalog every emprendedor gets, through the same services the
// UI uses.
async function seedEmprendedorCatalog(userId: VerifiedUserId): Promise<void> {
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
}

function supplierCuit(cuitBase: string): string {
  const digit = cuitCheckDigit(cuitBase);
  if (digit === null) throw new Error(`[seed] CUIT base "${cuitBase}" has no check digit`);
  return `${cuitBase}${digit}`;
}

// A supplier account registered through the first emprendedor's invite
// (creates the suppliers row and its first link), then linked to the rest
// with acceptSupplierInvite — the same path the UI takes (RN-22).
async function seedProveedor(
  admin: SupabaseClient,
  supplier: (typeof PROVEEDORES)[number],
  ownerIds: VerifiedUserId[],
): Promise<void> {
  const supplierId = await createUser(admin, supplier.email, supplier.displayName);

  const profile = {
    businessName: supplier.businessName,
    cuit: supplierCuit(supplier.cuitBase),
    contactName: supplier.contactName,
    phone: supplier.phone,
    categories: supplier.categories,
    acceptTerms: true,
  };

  const [first, ...rest] = ownerIds;
  const firstInvite = await createSupplierInviteService(first, { label: supplier.businessName });
  await registerSupplierService(supplierId, supplier.email, firstInvite.token, profile);

  for (const ownerId of rest) {
    const invite = await createSupplierInviteService(ownerId, { label: supplier.businessName });
    await acceptSupplierInviteService(supplierId, invite.token);
  }
}

async function seed(): Promise<void> {
  const env = readEnv();
  assertTarget(env);
  const admin = adminClient(env);

  try {
    for (const email of [...EMPRENDEDORES.map((u) => u.email), ...PROVEEDORES.map((u) => u.email), ...LEGACY_EMAILS]) {
      await deleteSeedUser(admin, email);
    }

    const ownerIds: VerifiedUserId[] = [];
    for (const emprendedor of EMPRENDEDORES) {
      const userId = await createUser(admin, emprendedor.email, emprendedor.displayName);
      await seedEmprendedorCatalog(userId);
      ownerIds.push(userId);
    }

    for (const proveedor of PROVEEDORES) {
      await seedProveedor(admin, proveedor, ownerIds);
    }

    console.log(
      `Seeded ${EMPRENDEDORES.length} emprendedores (${EMPRENDEDORES.map((u) => u.email).join(", ")}) ` +
        `and ${PROVEEDORES.length} proveedores (${PROVEEDORES.map((u) => u.email).join(", ")}), ` +
        `each supplier linked to every emprendedor.`,
    );
  } finally {
    await closeDb();
  }
}

await seed();
