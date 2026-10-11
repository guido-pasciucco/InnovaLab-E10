import { randomUUID } from "node:crypto";
import { fakerES as faker } from "@faker-js/faker";
import type { z } from "zod";
import { signupSchema } from "@/lib/schemas/auth/auth";
import { adminClient } from "../supabase";

// User factory: arranges accounts through the Supabase Admin API (back
// door), so no spec other than signup ever drives the signup UI.

// Derived from the signup form contract, so a new or changed field shows
// up here instead of silently drifting. displayName is optional in the
// form; the factory always fills it.
const userSchema = signupSchema.required();
export type FakeUser = z.infer<typeof userSchema>;
export type CreatedUser = FakeUser & { id: string };

// In-memory attributes only (nothing is persisted). Used as-is by the
// signup spec, which creates the account through the UI.
// Parsed with the app's own schema: if a validation rule changes (e.g. a
// longer minimum password), the factory fails loudly here instead of the
// UI failing with a confusing error. Specs that need deliberately invalid
// input must fill the form directly, not go through this factory.
export function buildUser(overrides: Partial<FakeUser> = {}): FakeUser {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  // The email is built from the same name as displayName. The UUID suffix
  // is what guarantees uniqueness (faker alone can repeat), avoiding GoTrue
  // per-email rate limits and stale Mailpit messages. Lowercased because
  // Supabase stores emails lowercased. `example.test` is a reserved TLD.
  const email = faker.internet
    .email({ firstName, lastName, provider: "example.test" })
    .replace("@", `-${randomUUID().slice(0, 8)}@`)
    .toLowerCase();

  return userSchema.parse({
    email,
    password: faker.internet.password({ length: 16 }),
    displayName: `${firstName} ${lastName}`,
    ...overrides,
  });
}

// Persists a confirmed user (`email_confirm: true`: no Mailpit round trip).
// The `on_auth_user_created` trigger also inserts its `public.profiles` row.
export async function createUser(overrides: Partial<FakeUser> = {}): Promise<CreatedUser> {
  const user = buildUser(overrides);
  const { data, error } = await adminClient().auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { display_name: user.displayName },
  });
  if (error || !data.user) throw new Error(`[test] createUser failed: ${error?.message ?? "no user"}`);
  return { ...user, id: data.user.id };
}

// Deletes the auth user AND its profile row. `public.profiles` has no FK to
// `auth.users` (known schema gap), so deleting the auth user alone would
// leave an orphan profile. The secret key bypasses RLS on the table.
export async function deleteUser(id: string): Promise<void> {
  const admin = adminClient();

  const { error: profileError } = await admin.from("profiles").delete().eq("id", id);
  if (profileError) throw new Error(`[test] deleting profile ${id} failed: ${profileError.message}`);

  const { error } = await admin.auth.admin.deleteUser(id);
  // Already gone is fine: cleanup must be idempotent.
  if (error && error.status !== 404) throw new Error(`[test] deleteUser ${id} failed: ${error.message}`);
}

// For users created outside the factory (the signup spec goes through the
// UI and only knows the email). The Admin API has no email filter, so this
// pages through the (small, local) user list.
export async function findUserIdByEmail(email: string): Promise<string | undefined> {
  const admin = adminClient();
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`[test] listUsers failed: ${error.message}`);
    const match = data.users.find((user) => user.email === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < perPage) return undefined;
  }
}
