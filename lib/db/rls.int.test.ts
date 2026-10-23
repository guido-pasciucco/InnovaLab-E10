import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { adminClient } from "../../tests/support/supabase";
import { loadTestEnv } from "../../tests/support/test-env";

// RLS validation against the local Supabase stack: Row Level Security
// policies prevent cross-tenant access, so each user only sees and modifies
// their own businesses and products.
//
// Setup goes through the admin client (secret key, bypasses RLS); the
// assertions go through a client signed in as each user, so every query is
// filtered by RLS as that user. Drizzle is not used here: its role bypasses
// RLS (see lib/db/AGENTS.md).
//
// Each test creates its own users and rows; users are deleted after each
// test (profile + auth user), cascading their businesses and products.

const users: CreatedUser[] = [];

// Attempts every deletion even if one fails, then reports all failures.
afterEach(async () => {
  const results = await Promise.allSettled(users.map((user) => deleteUser(user.id)));
  users.length = 0;
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((f) => f.reason),
      `cleanup failed for ${failures.length} user(s)`,
    );
  }
});

async function makeUser(): Promise<CreatedUser> {
  const user = await createUser();
  users.push(user);
  return user;
}

// Authenticates as a specific user and returns a client that carries their
// JWT, so every query goes through RLS as that user.
async function userClient(user: CreatedUser): Promise<SupabaseClient> {
  const env = loadTestEnv();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw new Error(`[int] RLS sign-in failed for ${user.email}: ${error.message}`);
  return client;
}

// Creates a business for a user via the admin client (bypasses RLS).
async function createBusiness(userId: string, name: string): Promise<string> {
  const { data, error } = await adminClient()
    .from("businesses")
    .insert({ owner_user_id: userId, name })
    .select("id")
    .single();
  if (error) throw new Error(`[int] createBusiness failed: ${error.message}`);
  return data.id;
}

// Creates a product for a business via the admin client (bypasses RLS).
async function createProduct(businessId: string, name: string): Promise<string> {
  const { data, error } = await adminClient()
    .from("products")
    .insert({ business_id: businessId, name })
    .select("id")
    .single();
  if (error) throw new Error(`[int] createProduct failed: ${error.message}`);
  return data.id;
}

// Creates a business cost line via the admin client (bypasses RLS).
async function createBusinessCostLine(businessId: string): Promise<string> {
  const { data, error } = await adminClient()
    .from("business_cost_lines")
    .insert({
      business_id: businessId,
      concept: "Harina",
      behavior: "variable",
      traceability: "directo",
      amount_period: "100.00",
    })
    .select("id")
    .single();
  if (error) throw new Error(`[int] createBusinessCostLine failed: ${error.message}`);
  return data.id;
}

// Creates a calculation via the admin client (bypasses RLS).
async function createCalculation(
  userId: string,
  businessId: string,
  productId: string,
): Promise<string> {
  const { data, error } = await adminClient()
    .from("calculations")
    .insert({ user_id: userId, business_id: businessId, product_id: productId })
    .select("id")
    .single();
  if (error) throw new Error(`[int] createCalculation failed: ${error.message}`);
  return data.id;
}

// Creates a calculation cost line via the admin client (bypasses RLS).
async function createCalculationCostLine(
  calculationId: string,
  sourceBusinessCostId: string,
): Promise<string> {
  const { data, error } = await adminClient()
    .from("calc_cost_lines")
    .insert({
      calculation_id: calculationId,
      source_business_cost_id: sourceBusinessCostId,
      concept: "Harina",
      behavior: "variable",
      traceability: "directo",
      amount: "50.00",
    })
    .select("id")
    .single();
  if (error) throw new Error(`[int] createCalculationCostLine failed: ${error.message}`);
  return data.id;
}

type Owner = {
  user: CreatedUser;
  businessId: string;
  businessName: string;
  productId: string;
  productName: string;
  costLineId: string;
};

// Two users, each owning one business with one product and one cost line.
async function arrangeTwoOwners(): Promise<{ ana: Owner; beto: Owner }> {
  const anaUser = await makeUser();
  const betoUser = await makeUser();
  const ana: Owner = {
    user: anaUser,
    businessId: await createBusiness(anaUser.id, "Panadería Ana"),
    businessName: "Panadería Ana",
    productId: "",
    productName: "Factura",
    costLineId: "",
  };
  const beto: Owner = {
    user: betoUser,
    businessId: await createBusiness(betoUser.id, "Cafetería Beto"),
    businessName: "Cafetería Beto",
    productId: "",
    productName: "Café",
    costLineId: "",
  };
  ana.productId = await createProduct(ana.businessId, ana.productName);
  beto.productId = await createProduct(beto.businessId, beto.productName);
  ana.costLineId = await createBusinessCostLine(ana.businessId);
  beto.costLineId = await createBusinessCostLine(beto.businessId);
  return { ana, beto };
}

describe("public.businesses", () => {
  it.each(["ana", "beto"] as const)("%s only sees their own business", async (name) => {
    const owners = await arrangeTwoOwners();
    const owner = owners[name];
    const client = await userClient(owner.user);

    const { data, error } = await client.from("businesses").select("*");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ id: owner.businessId, name: owner.businessName });
  });

  it("a user cannot delete another user's business", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    // RLS silently filters the row, so the delete affects 0 rows.
    const { error } = await client.from("businesses").delete().eq("id", beto.businessId);

    expect(error).toBeNull();
    // Checked as admin, bypassing RLS.
    const { data } = await adminClient().from("businesses").select("id").eq("id", beto.businessId);
    expect(data).toHaveLength(1);
  });

  it("a user cannot rename another user's business", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("businesses")
      .update({ name: "Hacked by Ana" })
      .eq("id", beto.businessId);

    expect(error).toBeNull();
    // Checked as admin, bypassing RLS.
    const { data } = await adminClient().from("businesses").select("name").eq("id", beto.businessId);
    expect(data![0].name).toBe(beto.businessName);
  });
});

describe("public.products", () => {
  it.each(["ana", "beto"] as const)(
    "%s only sees the products of their own business",
    async (name) => {
      const owners = await arrangeTwoOwners();
      const owner = owners[name];
      const client = await userClient(owner.user);

      const { data, error } = await client.from("products").select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].name).toBe(owner.productName);
    },
  );
});

describe("public.calculations", () => {
  it("a user cannot anchor their calculation to another user's business", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const client = await userClient(beto.user);

    // Beto's own row, pointing at Ana's business and product.
    const { error } = await client.from("calculations").insert({
      user_id: beto.user.id,
      business_id: ana.businessId,
      product_id: ana.productId,
    });

    // Violates the WITH CHECK once ownership is transitive (BUG-001).
    expect(error).not.toBeNull();
    // Checked as admin, bypassing RLS: no row was kept.
    const { data } = await adminClient()
      .from("calculations")
      .select("id")
      .eq("user_id", beto.user.id);
    expect(data).toHaveLength(0);
  });

  it("a user can insert a calculation on their own business", async () => {
    const { beto } = await arrangeTwoOwners();
    const client = await userClient(beto.user);

    const { error } = await client.from("calculations").insert({
      user_id: beto.user.id,
      business_id: beto.businessId,
      product_id: beto.productId,
    });

    expect(error).toBeNull();
  });

  it("a user cannot re-anchor their calculation to another user's business", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const calculationId = await createCalculation(beto.user.id, beto.businessId, beto.productId);
    const client = await userClient(beto.user);

    const { error } = await client
      .from("calculations")
      .update({ business_id: ana.businessId, product_id: ana.productId })
      .eq("id", calculationId);

    expect(error).toMatchObject({ code: "42501" });
    const { data } = await adminClient()
      .from("calculations")
      .select("business_id, product_id")
      .eq("id", calculationId)
      .single();
    expect(data).toMatchObject({ business_id: beto.businessId, product_id: beto.productId });
  });

  it("a user can update their own calculation status", async () => {
    const { beto } = await arrangeTwoOwners();
    const calculationId = await createCalculation(beto.user.id, beto.businessId, beto.productId);
    const client = await userClient(beto.user);

    const { error } = await client
      .from("calculations")
      .update({ status: "in_review" })
      .eq("id", calculationId);

    expect(error).toBeNull();
  });
});

describe("public.calc_cost_lines", () => {
  it("a user cannot source a line from another user's cost line", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const betoCalculationId = await createCalculation(
      beto.user.id,
      beto.businessId,
      beto.productId,
    );
    const client = await userClient(beto.user);

    // Beto's own calculation, snapshotting Ana's cost line.
    const { error } = await client.from("calc_cost_lines").insert({
      calculation_id: betoCalculationId,
      source_business_cost_id: ana.costLineId,
      concept: "Harina",
      behavior: "variable",
      traceability: "directo",
      amount: "50.00",
    });

    // Violates the WITH CHECK once ownership is transitive (BUG-001).
    expect(error).not.toBeNull();
    // Checked as admin, bypassing RLS: no row was kept.
    const { data } = await adminClient()
      .from("calc_cost_lines")
      .select("id")
      .eq("calculation_id", betoCalculationId);
    expect(data).toHaveLength(0);
  });

  it("a user can source a line from their own cost line", async () => {
    const { beto } = await arrangeTwoOwners();
    const betoCalculationId = await createCalculation(
      beto.user.id,
      beto.businessId,
      beto.productId,
    );
    const client = await userClient(beto.user);

    const { error } = await client.from("calc_cost_lines").insert({
      calculation_id: betoCalculationId,
      source_business_cost_id: beto.costLineId,
      concept: "Harina",
      behavior: "variable",
      traceability: "directo",
      amount: "50.00",
    });

    expect(error).toBeNull();
  });

  it("a user cannot re-anchor a calculation line to another user's cost line", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const betoCalculationId = await createCalculation(
      beto.user.id,
      beto.businessId,
      beto.productId,
    );
    const lineId = await createCalculationCostLine(betoCalculationId, beto.costLineId);
    const client = await userClient(beto.user);

    const { error } = await client
      .from("calc_cost_lines")
      .update({ source_business_cost_id: ana.costLineId })
      .eq("id", lineId);

    expect(error).toMatchObject({ code: "42501" });
    const { data } = await adminClient()
      .from("calc_cost_lines")
      .select("source_business_cost_id")
      .eq("id", lineId)
      .single();
    expect(data).toMatchObject({ source_business_cost_id: beto.costLineId });
  });

  it("a user can update their own calculation line amount", async () => {
    const { beto } = await arrangeTwoOwners();
    const betoCalculationId = await createCalculation(
      beto.user.id,
      beto.businessId,
      beto.productId,
    );
    const lineId = await createCalculationCostLine(betoCalculationId, beto.costLineId);
    const client = await userClient(beto.user);

    const { error } = await client
      .from("calc_cost_lines")
      .update({ amount: "75.00" })
      .eq("id", lineId);

    expect(error).toBeNull();
  });
});
