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
  const { data, error } = await adminClient().from(table).insert(values).select(idColumn).single();
  if (error || !data) throw new Error(`[int] insert ${table} failed: ${error?.message ?? "no row"}`);
  const id = data[idColumn];
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
      total_fixed: "1500.00",
      variable_unit: "800.00",
      total_cost: "2300.00",
      unit_cost: "23.00",
      contribution_margin_unit: "10.00",
      break_even_units: "150.0000",
      break_even_sales: "3000.00",
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
    expect(Number(data![0].unit_cost)).toBe(23.00);
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
});