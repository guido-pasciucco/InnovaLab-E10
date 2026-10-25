import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { adminClient } from "../../tests/support/supabase";
import { loadTestEnv } from "../../tests/support/test-env";

// RLS validation against the local Supabase stack: Row Level Security
// policies prevent cross-tenant access, so each user only sees and modifies
// their own rows. businesses and products hang from the owner directly.
// The calculation tables hang from a calculation seeded here via the admin
// client; costing_setup and pricing_inputs have no owner column and resolve
// membership through that calculation.
//
// Setup of the shared fixture goes through the admin client (secret key,
// bypasses RLS). Assertions go through a client signed in as each user.
// A denied insert, or a denied move of the anchor column, fails with 42501.
// A denied update or delete of someone else's row changes nothing; the admin
// client confirms the row. Drizzle is not used here: its role bypasses RLS
// (see lib/db/AGENTS.md).
//
// Each test creates its own users and rows. Deleting the auth user removes
// the profile, and the profile cascades businesses, products, cost lines,
// calculations and the rows that hang from those calculations.

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

type Owner = { user: CreatedUser; businessId: string; businessName: string; productName: string; productId: string };

// Two users, each owning one business with one product.
async function arrangeTwoOwners(): Promise<{ ana: Owner; beto: Owner }> {
  const anaUser = await makeUser();
  const betoUser = await makeUser();
  const anaBusinessId = await createBusiness(anaUser.id, "Panadería Ana");
  const anaProductId = await createProduct(anaBusinessId, "Factura");
  const betoBusinessId = await createBusiness(betoUser.id, "Cafetería Beto");
  const betoProductId = await createProduct(betoBusinessId, "Café");
  const ana: Owner = {
    user: anaUser,
    businessId: anaBusinessId,
    businessName: "Panadería Ana",
    productName: "Factura",
    productId: anaProductId,
  };

  const beto: Owner = {
    user: betoUser,
    businessId: betoBusinessId,
    businessName: "Cafetería Beto",
    productName: "Café",
    productId: betoProductId,
  };
  return { ana, beto };
}

// Shared amounts for a computed_results row. The client returns unit_cost as
// a number (23), not the text "23.00".
const UNIT_COST = "23.00";
const resultAmounts = {
  total_fixed: "1500.00",
  variable_unit: "800.00",
  total_cost: "2300.00",
  unit_cost: UNIT_COST,
  contribution_margin_unit: "10.00",
  break_even_units: "150.0000",
  break_even_sales: "3000.00",
} as const;

type OwnedCalculation = Owner & {
  costLineId: string;
  costLineConcept: string;
  calculationId: string;
  scenarioId: string;
  scenarioName: string;
  calcCostLineId: string;
  calcCostLineConcept: string;
  resultId: string;
};

// Inserts one row as admin and returns the generated id. The id column of
// costing_setup and pricing_inputs is calculation_id, not id.
async function insertRow(
  table: string,
  values: Record<string, unknown>,
  idColumn = "id",
): Promise<string> {
  const { data, error } = await adminClient().from(table).insert(values).select("*").single();
  if (error || !data || typeof data !== "object") {
  throw new Error(`[int] insert ${table} failed: ${error?.message ?? "no row"}`);
  }
  const id = (data as Record<string, unknown>)[idColumn];
  if (typeof id !== "string") throw new Error(`[int] insert ${table} returned no ${idColumn}`);
  return id;
}

// One calculation per owner, plus the rows that hang from it. Seeded as
// admin so the test asserts the policy, not whether the insert was allowed.
async function arrangeTwoCalculations(): Promise<{ ana: OwnedCalculation; beto: OwnedCalculation }> {
  const owners = await arrangeTwoOwners();

  async function seed(owner: Owner): Promise<OwnedCalculation> {
    const costLineConcept = `Alquiler ${owner.businessName}`;
    const costLineId = await insertRow("business_cost_lines", {
      business_id: owner.businessId,
      concept: costLineConcept,
      behavior: "fixed",
      traceability: "indirect",
      amount_period: "1500.00",
    });
    const calculationId = await insertRow("calculations", {
      user_id: owner.user.id,
      business_id: owner.businessId,
      product_id: owner.productId,
      status: "draft",
    });
    const scenarioName = `Base ${owner.productName}`;
    const scenarioId = await insertRow("scenarios", {
      calculation_id: calculationId,
      name: scenarioName,
    });
    const calcCostLineConcept = `Harina ${owner.productName}`;
    const calcCostLineId = await insertRow("calc_cost_lines", {
      calculation_id: calculationId,
      source_business_cost_id: costLineId,
      concept: calcCostLineConcept,
      behavior: "variable",
      traceability: "direct",
      amount: "800.00",
    });
    const resultId = await insertRow("computed_results", {
      calculation_id: calculationId,
      ...resultAmounts,
    });
    await insertRow(
      "costing_setup",
      {
        calculation_id: calculationId,
        currency: "ARS",
        period: "Mensual",
        unit: "unidad",
        volume: 100,
      },
      "calculation_id",
    );
    await insertRow(
      "pricing_inputs",
      {
        calculation_id: calculationId,
        margin_convention: "sobre_precio",
        expected_margin_pct: "30.0000",
      },
      "calculation_id",
    );
    return {
      ...owner,
      costLineId,
      costLineConcept,
      calculationId,
      scenarioId,
      scenarioName,
      calcCostLineId,
      calcCostLineConcept,
      resultId,
    };
  }

  return { ana: await seed(owners.ana), beto: await seed(owners.beto) };
}

async function adminRows(table: string, column: string, value: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await adminClient().from(table).select("*").eq(column, value);
  if (error) throw new Error(`[int] admin re-read ${table} failed: ${error.message}`);
  return data ?? [];
}

// profiles, costing_setup and pricing_inputs use the parent id as primary
// key. A sibling row already occupies that key, so a denied insert or move
// would surface as 23505 instead of 42501. Remove the sibling first.
async function adminDelete(table: string, column: string, value: string): Promise<void> {
  const { error } = await adminClient().from(table).delete().eq(column, value);
  if (error) throw new Error(`[int] admin delete ${table} failed: ${error.message}`);
}

// A calculation with no 1:1 child, so an insert can target that parent
// without colliding with an existing primary key.
async function bareCalculation(owner: Owner): Promise<string> {
  return insertRow("calculations", {
    user_id: owner.user.id,
    business_id: owner.businessId,
    product_id: owner.productId,
    status: "draft",
  });
}

// Ana owns the calculation; the business and the product belong to Beto.
// A policy anchored on business_id or product_id would show it to Beto.
async function divergentCalculation(ana: Owner, beto: Owner): Promise<string> {
  return insertRow("calculations", {
    user_id: ana.user.id,
    business_id: beto.businessId,
    product_id: beto.productId,
    status: "draft",
  });
}

type SecondBusiness = { businessId: string; productId: string };

async function secondBusiness(owner: Owner): Promise<SecondBusiness> {
  const businessId = await createBusiness(owner.user.id, `${owner.businessName} anexo`);
  const productId = await createProduct(businessId, `${owner.productName} extra`);
  return { businessId, productId };
}

async function unreferencedCostLine(owner: OwnedCalculation): Promise<string> {
  return insertRow("business_cost_lines", {
    business_id: owner.businessId,
    concept: `Luz ${owner.businessName}`,
    behavior: "fixed",
    traceability: "indirect",
    amount_period: "200.00",
  });
}

type SecondCalculation = {
  calculationId: string;
  scenarioId: string;
  calcCostLineId: string;
  resultId: string;
};

// A second calculation of the same owner, with its own children. A policy
// that keeps only the first row (`= (SELECT ... LIMIT 1)`) hides these.
async function secondCalculation(owner: OwnedCalculation): Promise<SecondCalculation> {
  const calculationId = await bareCalculation(owner);
  const scenarioId = await insertRow("scenarios", {
    calculation_id: calculationId,
    name: "Alternativa",
  });
  const calcCostLineId = await insertRow("calc_cost_lines", {
    calculation_id: calculationId,
    source_business_cost_id: owner.costLineId,
    concept: "Harina extra",
    behavior: "variable",
    traceability: "direct",
    amount: "100.00",
  });
  const resultId = await insertRow("computed_results", {
    calculation_id: calculationId,
    ...resultAmounts,
  });
  await insertRow(
    "costing_setup",
    {
      calculation_id: calculationId,
      currency: "ARS",
      period: "Mensual",
      unit: "docena",
      volume: 50,
    },
    "calculation_id",
  );
  await insertRow(
    "pricing_inputs",
    {
      calculation_id: calculationId,
      margin_convention: "sobre_costo",
      expected_margin_pct: "10.0000",
    },
    "calculation_id",
  );
  return { calculationId, scenarioId, calcCostLineId, resultId };
}

function sortedIds(rows: { id: string }[] | null): string[] {
  return (rows ?? []).map((row) => row.id).sort();
}

function sortedCalculationIds(rows: { calculation_id: string }[] | null): string[] {
  return (rows ?? []).map((row) => row.calculation_id).sort();
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

  it("a user cannot insert a business owned by another user", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    const { error } = await client.from("businesses").insert({ owner_user_id: beto.user.id, name: "Intruso" });

    expect(error?.code).toBe("42501");
    const rows = await adminRows("businesses", "owner_user_id", beto.user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe(beto.businessName);
  });

  it("a user sees a second business that has no calculation", async () => {
    const { ana } = await arrangeTwoOwners();
    const extra = await secondBusiness(ana);
    const client = await userClient(ana.user);

    const { data, error } = await client.from("businesses").select("id");

    expect(error).toBeNull();
    expect(sortedIds(data)).toEqual([ana.businessId, extra.businessId].sort());
  });

  it("a user can rename their own business", async () => {
    const { ana } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    const { error } = await client.from("businesses").update({ name: "Panadería Ana 2" }).eq("id", ana.businessId);

    expect(error).toBeNull();
    const rows = await adminRows("businesses", "id", ana.businessId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Panadería Ana 2");
  });

  it("a user can delete their own business", async () => {
    const { ana } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    const { error } = await client.from("businesses").delete().eq("id", ana.businessId);

    expect(error).toBeNull();
    expect(await adminRows("businesses", "id", ana.businessId)).toHaveLength(0);
  });

  it("a user cannot move their own business to another owner", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("businesses")
      .update({ owner_user_id: beto.user.id })
      .eq("id", ana.businessId);

    expect(error?.code).toBe("42501");
    const rows = await adminRows("businesses", "id", ana.businessId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.owner_user_id).toBe(ana.user.id);
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

  it("a user cannot delete the product of another user's business", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    // RLS silently filters the row, so the delete affects 0 rows.
    const { error } = await client.from("products").delete().eq("id", beto.productId);

    expect(error).toBeNull();
    // Checked as admin, bypassing RLS.
    const { data } = await adminClient().from("products").select("id").eq("id", beto.productId);
    expect(data).toHaveLength(1);
  });

  it("a user cannot rename the product of another user's business", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("products")
      .update({ name: "Hacked by Ana" })
      .eq("id", beto.productId);

    expect(error).toBeNull();
    // Checked as admin, bypassing RLS.
    const { data } = await adminClient().from("products").select("name").eq("id", beto.productId);
    expect(data![0].name).toBe(beto.productName);
  });

  it("a user cannot insert a product into another user's business", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    const { error } = await client.from("products").insert({ business_id: beto.businessId, name: "Intruso" });

    expect(error?.code).toBe("42501");
    const rows = await adminRows("products", "business_id", beto.businessId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe(beto.productName);
  });

  it("a user sees a second product when its business has no calculation", async () => {
    const { ana } = await arrangeTwoOwners();
    const extra = await secondBusiness(ana);
    const client = await userClient(ana.user);

    const { data, error } = await client.from("products").select("id");

    expect(error).toBeNull();
    expect(sortedIds(data)).toEqual([ana.productId, extra.productId].sort());
  });

  it("a user can rename their own product", async () => {
    const { ana } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    const { error } = await client.from("products").update({ name: "Factura 2" }).eq("id", ana.productId);

    expect(error).toBeNull();
    const rows = await adminRows("products", "id", ana.productId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Factura 2");
  });

  it("a user can delete their own product", async () => {
    const { ana } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    const { error } = await client.from("products").delete().eq("id", ana.productId);

    expect(error).toBeNull();
    expect(await adminRows("products", "id", ana.productId)).toHaveLength(0);
  });

  it("a user cannot move their own product to another user's business", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("products")
      .update({ business_id: beto.businessId })
      .eq("id", ana.productId);

    expect(error?.code).toBe("42501");
    const rows = await adminRows("products", "id", ana.productId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.business_id).toBe(ana.businessId);
  });
});

describe("public.profiles", () => {
  it.each(["ana", "beto"] as const)("%s only sees their own profile", async (name) => {
    const owners = await arrangeTwoOwners();
    const owner = owners[name];
    const client = await userClient(owner.user);

    const { data, error } = await client.from("profiles").select("*");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ id: owner.user.id, display_name: owner.user.displayName });
  });

  it("a user cannot delete another user's profile", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    const { error } = await client.from("profiles").delete().eq("id", beto.user.id);

    expect(error).toBeNull();
    const { data } = await adminClient().from("profiles").select("id").eq("id", beto.user.id);
    expect(data).toHaveLength(1);
  });

  it("a user cannot rename another user's profile", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("profiles")
      .update({ display_name: "Hacked by Ana" })
      .eq("id", beto.user.id);

    expect(error).toBeNull();
    const { data } = await adminClient().from("profiles").select("display_name").eq("id", beto.user.id);
    expect(data![0].display_name).toBe(beto.user.displayName);
  });

  it("a user cannot insert another user's profile", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    await adminDelete("profiles", "id", beto.id);
    const client = await userClient(ana);

    const { error } = await client.from("profiles").insert({ id: beto.id, display_name: "Intruso" });

    expect(error?.code).toBe("42501");
    expect(await adminRows("profiles", "id", beto.id)).toHaveLength(0);
  });

  it("a user can rename their own profile", async () => {
    const ana = await makeUser();
    const client = await userClient(ana);

    const { error } = await client.from("profiles").update({ display_name: "Ana actualizada" }).eq("id", ana.id);

    expect(error).toBeNull();
    const rows = await adminRows("profiles", "id", ana.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.display_name).toBe("Ana actualizada");
  });

  it("a user can delete their own profile", async () => {
    const ana = await makeUser();
    const client = await userClient(ana);

    const { error } = await client.from("profiles").delete().eq("id", ana.id);

    expect(error).toBeNull();
    expect(await adminRows("profiles", "id", ana.id)).toHaveLength(0);
  });

  it("a user cannot retarget their profile id to another user", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    await adminDelete("profiles", "id", beto.id);
    const client = await userClient(ana);

    const { error } = await client.from("profiles").update({ id: beto.id }).eq("id", ana.id);

    expect(error?.code).toBe("42501");
    const rows = await adminRows("profiles", "id", ana.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.display_name).toBe(ana.displayName);
    expect(await adminRows("profiles", "id", beto.id)).toHaveLength(0);
  });
});

describe("public.business_cost_lines", () => {
  it.each(["ana", "beto"] as const)("%s only sees the cost lines of their own business", async (name) => {
    const owners = await arrangeTwoCalculations();
    const owner = owners[name];
    const client = await userClient(owner.user);

    const { data, error } = await client.from("business_cost_lines").select("*");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ id: owner.costLineId, concept: owner.costLineConcept });
  });

  it("a user cannot delete a cost line of another user's business", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("business_cost_lines").delete().eq("id", beto.costLineId);

    expect(error).toBeNull();
    const { data } = await adminClient().from("business_cost_lines").select("id").eq("id", beto.costLineId);
    expect(data).toHaveLength(1);
  });

  it("a user cannot rename a cost line of another user's business", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("business_cost_lines")
      .update({ concept: "Hacked by Ana" })
      .eq("id", beto.costLineId);

    expect(error).toBeNull();
    const { data } = await adminClient()
      .from("business_cost_lines")
      .select("concept")
      .eq("id", beto.costLineId);
    expect(data![0].concept).toBe(beto.costLineConcept);
  });

  it("a user cannot insert a cost line into another user's business", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("business_cost_lines").insert({
      business_id: beto.businessId,
      concept: "Intruso",
      behavior: "fixed",
      traceability: "indirect",
      amount_period: "10.00",
    });

    expect(error?.code).toBe("42501");
    const rows = await adminRows("business_cost_lines", "business_id", beto.businessId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.concept).toBe(beto.costLineConcept);
  });

  it("a user sees a cost line that no calculation references", async () => {
    const { ana } = await arrangeTwoCalculations();
    const extraId = await unreferencedCostLine(ana);
    const client = await userClient(ana.user);

    const { data, error } = await client.from("business_cost_lines").select("id");

    expect(error).toBeNull();
    expect(sortedIds(data)).toEqual([ana.costLineId, extraId].sort());
  });

  it("a user can rename their own cost line", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("business_cost_lines")
      .update({ concept: "Alquiler actualizado" })
      .eq("id", ana.costLineId);

    expect(error).toBeNull();
    const rows = await adminRows("business_cost_lines", "id", ana.costLineId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.concept).toBe("Alquiler actualizado");
  });

  it("a user can delete their own cost line", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("business_cost_lines").delete().eq("id", ana.costLineId);

    expect(error).toBeNull();
    expect(await adminRows("business_cost_lines", "id", ana.costLineId)).toHaveLength(0);
  });

  it("a user cannot move their own cost line to another user's business", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("business_cost_lines")
      .update({ business_id: beto.businessId })
      .eq("id", ana.costLineId);

    expect(error?.code).toBe("42501");
    const rows = await adminRows("business_cost_lines", "id", ana.costLineId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.business_id).toBe(ana.businessId);
  });
});

describe("public.calculations", () => {
  it.each(["ana", "beto"] as const)("%s only sees their own calculation", async (name) => {
    const owners = await arrangeTwoCalculations();
    const owner = owners[name];
    const client = await userClient(owner.user);

    const { data, error } = await client.from("calculations").select("*");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ id: owner.calculationId, user_id: owner.user.id });
  });

  it("a user cannot delete another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("calculations").delete().eq("id", beto.calculationId);

    expect(error).toBeNull();
    const { data } = await adminClient().from("calculations").select("id").eq("id", beto.calculationId);
    expect(data).toHaveLength(1);
  });

  it("a user cannot change the status of another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("calculations")
      .update({ status: "hacked" })
      .eq("id", beto.calculationId);

    expect(error).toBeNull();
    const { data } = await adminClient().from("calculations").select("status").eq("id", beto.calculationId);
    expect(data![0].status).toBe("draft");
  });

  // user_id is the anchor. Pointing business_id and product_id at another
  // tenant is #117 and is not asserted here.
  it("a user cannot insert a calculation owned by another user", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("calculations").insert({
      user_id: beto.user.id,
      business_id: ana.businessId,
      product_id: ana.productId,
      status: "draft",
    });

    expect(error?.code).toBe("42501");
    const rows = await adminRows("calculations", "user_id", beto.user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(beto.calculationId);
  });

  it("a user sees a calculation that points at another user's business and product", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    const calculationId = await divergentCalculation(ana, beto);
    const client = await userClient(ana.user);

    const { data, error } = await client.from("calculations").select("id, user_id");

    expect(error).toBeNull();
    expect(data).toEqual([expect.objectContaining({ id: calculationId, user_id: ana.user.id })]);
  });

  it("a user does not see a calculation on their business when someone else owns it", async () => {
    const { ana, beto } = await arrangeTwoOwners();
    await divergentCalculation(ana, beto);
    const client = await userClient(beto.user);

    const { data, error } = await client.from("calculations").select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("a user sees both calculations when they own a second one", async () => {
    const { ana } = await arrangeTwoCalculations();
    const extra = await secondCalculation(ana);
    const client = await userClient(ana.user);

    const { data, error } = await client.from("calculations").select("id");

    expect(error).toBeNull();
    expect(sortedIds(data)).toEqual([ana.calculationId, extra.calculationId].sort());
  });

  it("a user can change the status of their own calculation", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("calculations").update({ status: "ready" }).eq("id", ana.calculationId);

    expect(error).toBeNull();
    const rows = await adminRows("calculations", "id", ana.calculationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("ready");
  });

  it("a user can delete their own calculation", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("calculations").delete().eq("id", ana.calculationId);

    expect(error).toBeNull();
    expect(await adminRows("calculations", "id", ana.calculationId)).toHaveLength(0);
  });

  it("a user cannot move their own calculation to another user", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("calculations")
      .update({ user_id: beto.user.id })
      .eq("id", ana.calculationId);

    expect(error?.code).toBe("42501");
    const rows = await adminRows("calculations", "id", ana.calculationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.user_id).toBe(ana.user.id);
  });
});

describe("public.scenarios", () => {
  it.each(["ana", "beto"] as const)("%s only sees the scenarios of their own calculation", async (name) => {
    const owners = await arrangeTwoCalculations();
    const owner = owners[name];
    const client = await userClient(owner.user);

    const { data, error } = await client.from("scenarios").select("*");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ id: owner.scenarioId, name: owner.scenarioName });
  });

  it("a user cannot delete a scenario of another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("scenarios").delete().eq("id", beto.scenarioId);

    expect(error).toBeNull();
    const { data } = await adminClient().from("scenarios").select("id").eq("id", beto.scenarioId);
    expect(data).toHaveLength(1);
  });

  it("a user cannot rename a scenario of another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("scenarios")
      .update({ name: "Hacked by Ana" })
      .eq("id", beto.scenarioId);

    expect(error).toBeNull();
    const { data } = await adminClient().from("scenarios").select("name").eq("id", beto.scenarioId);
    expect(data![0].name).toBe(beto.scenarioName);
  });

  it("a user cannot insert a scenario into another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("scenarios").insert({ calculation_id: beto.calculationId, name: "Intruso" });

    expect(error?.code).toBe("42501");
    const rows = await adminRows("scenarios", "calculation_id", beto.calculationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe(beto.scenarioName);
  });

  it("a user sees both scenarios when they own a second calculation", async () => {
    const { ana } = await arrangeTwoCalculations();
    const extra = await secondCalculation(ana);
    const client = await userClient(ana.user);

    const { data, error } = await client.from("scenarios").select("id");

    expect(error).toBeNull();
    expect(sortedIds(data)).toEqual([ana.scenarioId, extra.scenarioId].sort());
  });

  it("a user can rename their own scenario", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("scenarios").update({ name: "Base actualizada" }).eq("id", ana.scenarioId);

    expect(error).toBeNull();
    const rows = await adminRows("scenarios", "id", ana.scenarioId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Base actualizada");
  });

  it("a user can delete their own scenario", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("scenarios").delete().eq("id", ana.scenarioId);

    expect(error).toBeNull();
    expect(await adminRows("scenarios", "id", ana.scenarioId)).toHaveLength(0);
  });

  it("a user cannot move their own scenario to another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("scenarios")
      .update({ calculation_id: beto.calculationId })
      .eq("id", ana.scenarioId);

    expect(error?.code).toBe("42501");
    const rows = await adminRows("scenarios", "id", ana.scenarioId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.calculation_id).toBe(ana.calculationId);
  });
});

describe("public.calc_cost_lines", () => {
  it.each(["ana", "beto"] as const)("%s only sees the cost lines of their own calculation", async (name) => {
    const owners = await arrangeTwoCalculations();
    const owner = owners[name];
    const client = await userClient(owner.user);

    const { data, error } = await client.from("calc_cost_lines").select("*");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ id: owner.calcCostLineId, concept: owner.calcCostLineConcept });
  });

  it("a user cannot delete a cost line of another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("calc_cost_lines").delete().eq("id", beto.calcCostLineId);

    expect(error).toBeNull();
    const { data } = await adminClient().from("calc_cost_lines").select("id").eq("id", beto.calcCostLineId);
    expect(data).toHaveLength(1);
  });

  it("a user cannot rename a cost line of another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("calc_cost_lines")
      .update({ concept: "Hacked by Ana" })
      .eq("id", beto.calcCostLineId);

    expect(error).toBeNull();
    const { data } = await adminClient()
      .from("calc_cost_lines")
      .select("concept")
      .eq("id", beto.calcCostLineId);
    expect(data![0].concept).toBe(beto.calcCostLineConcept);
  });

  it("a user cannot insert a cost line into another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("calc_cost_lines").insert({
      calculation_id: beto.calculationId,
      source_business_cost_id: ana.costLineId,
      concept: "Intruso",
      behavior: "variable",
      traceability: "direct",
      amount: "1.00",
    });

    expect(error?.code).toBe("42501");
    const rows = await adminRows("calc_cost_lines", "calculation_id", beto.calculationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.concept).toBe(beto.calcCostLineConcept);
  });

  it("a user sees both calculation cost lines when they own a second calculation", async () => {
    const { ana } = await arrangeTwoCalculations();
    const extra = await secondCalculation(ana);
    const client = await userClient(ana.user);

    const { data, error } = await client.from("calc_cost_lines").select("id");

    expect(error).toBeNull();
    expect(sortedIds(data)).toEqual([ana.calcCostLineId, extra.calcCostLineId].sort());
  });

  it("a user can rename their own calculation cost line", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("calc_cost_lines")
      .update({ concept: "Harina actualizada" })
      .eq("id", ana.calcCostLineId);

    expect(error).toBeNull();
    const rows = await adminRows("calc_cost_lines", "id", ana.calcCostLineId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.concept).toBe("Harina actualizada");
  });

  it("a user can delete their own calculation cost line", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("calc_cost_lines").delete().eq("id", ana.calcCostLineId);

    expect(error).toBeNull();
    expect(await adminRows("calc_cost_lines", "id", ana.calcCostLineId)).toHaveLength(0);
  });

  it("a user cannot move their own calculation cost line to another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("calc_cost_lines")
      .update({ calculation_id: beto.calculationId })
      .eq("id", ana.calcCostLineId);

    expect(error?.code).toBe("42501");
    const rows = await adminRows("calc_cost_lines", "id", ana.calcCostLineId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.calculation_id).toBe(ana.calculationId);
  });
});

describe("public.computed_results", () => {
  it.each(["ana", "beto"] as const)("%s only sees the results of their own calculation", async (name) => {
    const owners = await arrangeTwoCalculations();
    const owner = owners[name];
    const client = await userClient(owner.user);

    const { data, error } = await client.from("computed_results").select("*");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(owner.resultId);
  });

  it("a user cannot delete the results of another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("computed_results").delete().eq("id", beto.resultId);

    expect(error).toBeNull();
    const { data } = await adminClient().from("computed_results").select("id").eq("id", beto.resultId);
    expect(data).toHaveLength(1);
  });

  it("a user cannot change the unit cost of another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("computed_results")
      .update({ unit_cost: "1.00" })
      .eq("id", beto.resultId);

    expect(error).toBeNull();
    const { data } = await adminClient().from("computed_results").select("unit_cost").eq("id", beto.resultId);
    expect(Number(data![0].unit_cost)).toBe(Number(UNIT_COST));
  });

  it("a user cannot insert results into another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("computed_results").insert({
      calculation_id: beto.calculationId,
      ...resultAmounts,
      unit_cost: "1.00",
    });

    expect(error?.code).toBe("42501");
    const rows = await adminRows("computed_results", "calculation_id", beto.calculationId);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]?.unit_cost)).toBe(Number(UNIT_COST));
  });

  it("a user sees both results when they own a second calculation", async () => {
    const { ana } = await arrangeTwoCalculations();
    const extra = await secondCalculation(ana);
    const client = await userClient(ana.user);

    const { data, error } = await client.from("computed_results").select("id");

    expect(error).toBeNull();
    expect(sortedIds(data)).toEqual([ana.resultId, extra.resultId].sort());
  });

  it("a user can change the unit cost of their own calculation", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("computed_results").update({ unit_cost: "24.00" }).eq("id", ana.resultId);

    expect(error).toBeNull();
    const rows = await adminRows("computed_results", "id", ana.resultId);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]?.unit_cost)).toBe(24);
  });

  it("a user can delete the results of their own calculation", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("computed_results").delete().eq("id", ana.resultId);

    expect(error).toBeNull();
    expect(await adminRows("computed_results", "id", ana.resultId)).toHaveLength(0);
  });

  it("a user cannot move their own results to another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("computed_results")
      .update({ calculation_id: beto.calculationId })
      .eq("id", ana.resultId);

    expect(error?.code).toBe("42501");
    const rows = await adminRows("computed_results", "id", ana.resultId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.calculation_id).toBe(ana.calculationId);
  });
});

describe("public.costing_setup", () => {
  it.each(["ana", "beto"] as const)("%s only sees the setup of their own calculation", async (name) => {
    const owners = await arrangeTwoCalculations();
    const owner = owners[name];
    const client = await userClient(owner.user);

    const { data, error } = await client.from("costing_setup").select("*");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ calculation_id: owner.calculationId, unit: "unidad" });
  });

  it("a user cannot delete the setup of another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("costing_setup").delete().eq("calculation_id", beto.calculationId);

    expect(error).toBeNull();
    const { data } = await adminClient()
      .from("costing_setup")
      .select("calculation_id")
      .eq("calculation_id", beto.calculationId);
    expect(data).toHaveLength(1);
  });

  it("a user cannot change the unit of another user's setup", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("costing_setup")
      .update({ unit: "Hacked by Ana" })
      .eq("calculation_id", beto.calculationId);

    expect(error).toBeNull();
    const { data } = await adminClient()
      .from("costing_setup")
      .select("unit")
      .eq("calculation_id", beto.calculationId);
    expect(data![0].unit).toBe("unidad");
  });

  it("a user cannot insert a setup into another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const bareId = await bareCalculation(beto);
    const client = await userClient(ana.user);

    const { error } = await client.from("costing_setup").insert({
      calculation_id: bareId,
      currency: "ARS",
      period: "Mensual",
      unit: "unidad",
      volume: 100,
    });

    expect(error?.code).toBe("42501");
    expect(await adminRows("costing_setup", "calculation_id", bareId)).toHaveLength(0);
  });

  it("a user sees both setups when they own a second calculation", async () => {
    const { ana } = await arrangeTwoCalculations();
    const extra = await secondCalculation(ana);
    const client = await userClient(ana.user);

    const { data, error } = await client.from("costing_setup").select("calculation_id");

    expect(error).toBeNull();
    expect(sortedCalculationIds(data)).toEqual([ana.calculationId, extra.calculationId].sort());
  });

  it("a user can change the unit of measure of their own setup", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("costing_setup")
      .update({ unit: "docena" })
      .eq("calculation_id", ana.calculationId);

    expect(error).toBeNull();
    const rows = await adminRows("costing_setup", "calculation_id", ana.calculationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.unit).toBe("docena");
  });

  it("a user can delete the setup of their own calculation", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("costing_setup").delete().eq("calculation_id", ana.calculationId);

    expect(error).toBeNull();
    expect(await adminRows("costing_setup", "calculation_id", ana.calculationId)).toHaveLength(0);
  });

  it("a user cannot move their own setup onto another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    await adminDelete("costing_setup", "calculation_id", beto.calculationId);
    const client = await userClient(ana.user);

    const { error } = await client
      .from("costing_setup")
      .update({ calculation_id: beto.calculationId })
      .eq("calculation_id", ana.calculationId);

    expect(error?.code).toBe("42501");
    const rows = await adminRows("costing_setup", "calculation_id", ana.calculationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.unit).toBe("unidad");
    expect(await adminRows("costing_setup", "calculation_id", beto.calculationId)).toHaveLength(0);
  });
});

describe("public.pricing_inputs", () => {
  it.each(["ana", "beto"] as const)("%s only sees the pricing of their own calculation", async (name) => {
    const owners = await arrangeTwoCalculations();
    const owner = owners[name];
    const client = await userClient(owner.user);

    const { data, error } = await client.from("pricing_inputs").select("*");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({
      calculation_id: owner.calculationId,
      margin_convention: "sobre_precio",
    });
  });

  it("a user cannot delete the pricing of another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("pricing_inputs").delete().eq("calculation_id", beto.calculationId);

    expect(error).toBeNull();
    const { data } = await adminClient()
      .from("pricing_inputs")
      .select("calculation_id")
      .eq("calculation_id", beto.calculationId);
    expect(data).toHaveLength(1);
  });

  it("a user cannot change the margin convention of another user's pricing", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("pricing_inputs")
      .update({ margin_convention: "Hacked by Ana" })
      .eq("calculation_id", beto.calculationId);

    expect(error).toBeNull();
    const { data } = await adminClient()
      .from("pricing_inputs")
      .select("margin_convention")
      .eq("calculation_id", beto.calculationId);
    expect(data![0].margin_convention).toBe("sobre_precio");
  });

  it("a user cannot insert pricing into another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    const bareId = await bareCalculation(beto);
    const client = await userClient(ana.user);

    const { error } = await client.from("pricing_inputs").insert({
      calculation_id: bareId,
      margin_convention: "sobre_precio",
      expected_margin_pct: "30.0000",
    });

    expect(error?.code).toBe("42501");
    expect(await adminRows("pricing_inputs", "calculation_id", bareId)).toHaveLength(0);
  });

  it("a user sees both pricing rows when they own a second calculation", async () => {
    const { ana } = await arrangeTwoCalculations();
    const extra = await secondCalculation(ana);
    const client = await userClient(ana.user);

    const { data, error } = await client.from("pricing_inputs").select("calculation_id");

    expect(error).toBeNull();
    expect(sortedCalculationIds(data)).toEqual([ana.calculationId, extra.calculationId].sort());
  });

  it("a user can change the margin convention of their own pricing", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client
      .from("pricing_inputs")
      .update({ margin_convention: "sobre_costo" })
      .eq("calculation_id", ana.calculationId);

    expect(error).toBeNull();
    const rows = await adminRows("pricing_inputs", "calculation_id", ana.calculationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.margin_convention).toBe("sobre_costo");
  });

  it("a user can delete the pricing of their own calculation", async () => {
    const { ana } = await arrangeTwoCalculations();
    const client = await userClient(ana.user);

    const { error } = await client.from("pricing_inputs").delete().eq("calculation_id", ana.calculationId);

    expect(error).toBeNull();
    expect(await adminRows("pricing_inputs", "calculation_id", ana.calculationId)).toHaveLength(0);
  });

  it("a user cannot move their own pricing onto another user's calculation", async () => {
    const { ana, beto } = await arrangeTwoCalculations();
    await adminDelete("pricing_inputs", "calculation_id", beto.calculationId);
    const client = await userClient(ana.user);

    const { error } = await client
      .from("pricing_inputs")
      .update({ calculation_id: beto.calculationId })
      .eq("calculation_id", ana.calculationId);

    expect(error?.code).toBe("42501");
    const rows = await adminRows("pricing_inputs", "calculation_id", ana.calculationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.margin_convention).toBe("sobre_precio");
    expect(await adminRows("pricing_inputs", "calculation_id", beto.calculationId)).toHaveLength(0);
  });
});