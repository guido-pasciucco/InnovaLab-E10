import { afterAll, afterEach, describe, expect, it } from "vitest";

import { closeDrizzleClient, getDrizzleClient } from "@/lib/db/client";
import { createUser, deleteUser, type CreatedUser } from "@/tests/support/factories/user";
import { acquireHelpLeaseService, HELP_RATE_LIMIT } from "./help-consumption";

const created: CreatedUser[] = [];

afterEach(async () => {
  const users = created.splice(0);
  const results = await Promise.allSettled(users.map((user) => deleteUser(user.id)));
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(failures.map((failure) => failure.reason), "cleanup failed");
  }
});

afterAll(async () => {
  await closeDrizzleClient();
});

describe("acquireHelpLeaseService", () => {
  it("allows only one concurrent request across database clients", async () => {
    const user = await createUser();
    created.push(user);
    const db = getDrizzleClient();

    const results = await Promise.allSettled([
      acquireHelpLeaseService(user.id, new Date(), crypto.randomUUID(), db),
      acquireHelpLeaseService(user.id, new Date(), crypto.randomUUID(), db),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({ reason: { code: "HELP_BUSY" } });
    const fulfilled = results.find(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof acquireHelpLeaseService>>> =>
        result.status === "fulfilled",
    );
    await fulfilled?.value.release();
  });

  it("rejects requests after the shared per-user window is exhausted", async () => {
    const user = await createUser();
    created.push(user);
    const db = getDrizzleClient();
    const now = new Date("2026-11-21T18:00:00.000Z");

    for (let index = 0; index < HELP_RATE_LIMIT; index += 1) {
      const lease = await acquireHelpLeaseService(user.id, now, crypto.randomUUID(), db);
      await lease.release();
    }

    await expect(
      acquireHelpLeaseService(user.id, now, crypto.randomUUID(), db),
    ).rejects.toMatchObject({ code: "HELP_RATE_LIMITED" });
  });
});
