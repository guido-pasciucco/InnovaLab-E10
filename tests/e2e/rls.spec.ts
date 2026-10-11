import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "./fixtures";
import { adminClient } from "../support/supabase";
import { loadTestEnv } from "../support/test-env";
import { createUser, deleteUser, type CreatedUser } from "../support/factories/user";

// RLS validation: verifies that Row Level Security policies prevent
// cross-tenant data access. Each user should only see and modify their
// own businesses and products.
//
// NOTE: run the e2e suite with Node 24 (`package.json` engines). On
// Node 20 `@supabase/supabase-js` crashes at client creation because
// the native WebSocket is missing — that is an environment issue,
// not an RLS failure.

// Authenticates as a specific user and returns a client that carries
// their JWT, so every query goes through RLS as that user.
async function userClient(user: CreatedUser): Promise<SupabaseClient> {
  const env = loadTestEnv();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw new Error(`[e2e] RLS sign-in failed for ${user.email}: ${error.message}`);
  return client;
}

// Deletes every tracked user even if one deletion fails, then reports all
// failures together.
async function deleteUsers(users: CreatedUser[]): Promise<void> {
  const results = await Promise.allSettled(users.map((user) => deleteUser(user.id)));
  users.length = 0;
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((f) => f.reason),
      `[e2e] RLS cleanup failed for ${failures.length} user(s)`,
    );
  }
}

// Creates a product for a business via the admin client (bypasses RLS).
async function createProduct(businessId: string, name: string): Promise<void> {
  const { error } = await adminClient().from("products").insert({ business_id: businessId, name });
  if (error) throw new Error(`[e2e] createProduct failed: ${error.message}`);
}

// Creates a business for a user via the admin client (bypasses RLS).
async function createBusiness(userId: string, name: string): Promise<string> {
  const { data, error } = await adminClient()
    .from("businesses")
    .insert({ owner_user_id: userId, name })
    .select("id")
    .single();
  if (error) throw new Error(`[e2e] createBusiness failed: ${error.message}`);
  return data.id;
}

test.describe("public.businesses", () => {
  // Every user is tracked as soon as it exists, so afterAll deletes it even
  // if beforeAll fails midway.
  const created: CreatedUser[] = [];
  let ana: CreatedUser | undefined;
  let beto: CreatedUser | undefined;
  let anaBusinessId: string;
  let betoBusinessId: string;

  test.beforeAll(async () => {
    ana = await createUser();
    created.push(ana);
    beto = await createUser();
    created.push(beto);
    anaBusinessId = await createBusiness(ana.id, "Panadería Ana");
    betoBusinessId = await createBusiness(beto.id, "Cafetería Beto");
  });

  test.afterAll(async () => {
    await deleteUsers(created);
  });

  test("Ana only sees her own business", async () => {
    const client = await userClient(ana!);
    const { data, error } = await client.from("businesses").select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(anaBusinessId);
    expect(data![0].name).toBe("Panadería Ana");
  });

  test("Beto only sees his own business", async () => {
    const client = await userClient(beto!);
    const { data, error } = await client.from("businesses").select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(betoBusinessId);
    expect(data![0].name).toBe("Cafetería Beto");
  });

  test("Ana cannot delete Beto's business", async () => {
    const client = await userClient(ana!);
    const { error } = await client.from("businesses").delete().eq("id", betoBusinessId);
    // RLS silently filters the row, so the delete affects 0 rows.
    expect(error).toBeNull();
    // Verify Beto's business still exists (checked as admin, bypassing RLS).
    const { data } = await adminClient().from("businesses").select("id").eq("id", betoBusinessId);
    expect(data).toHaveLength(1);
  });

  test("Ana cannot update Beto's business", async () => {
    const client = await userClient(ana!);
    const { error } = await client
      .from("businesses")
      .update({ name: "Hacked by Ana" })
      .eq("id", betoBusinessId);
    expect(error).toBeNull();
    // Verify the name was NOT changed (checked as admin, bypassing RLS).
    const { data } = await adminClient().from("businesses").select("name").eq("id", betoBusinessId);
    expect(data![0].name).toBe("Cafetería Beto");
  });
});

test.describe("public.products", () => {
  // See public.businesses: tracked users are deleted even if setup fails.
  const created: CreatedUser[] = [];
  let ana: CreatedUser | undefined;
  let beto: CreatedUser | undefined;

  test.beforeAll(async () => {
    ana = await createUser();
    created.push(ana);
    beto = await createUser();
    created.push(beto);
    const anaBusinessId = await createBusiness(ana.id, "Panadería Ana");
    const betoBusinessId = await createBusiness(beto.id, "Cafetería Beto");

    // Products inherit ownership from their business; created as admin.
    await createProduct(anaBusinessId, "Factura");
    await createProduct(betoBusinessId, "Café");
  });

  test.afterAll(async () => {
    await deleteUsers(created);
  });

  test("Ana only sees products from her own business", async () => {
    const client = await userClient(ana!);
    const { data, error } = await client.from("products").select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].name).toBe("Factura");
  });

  test("Beto only sees products from his own business", async () => {
    const client = await userClient(beto!);
    const { data, error } = await client.from("products").select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].name).toBe("Café");
  });
});
