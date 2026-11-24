import { describe, expect, it, vi } from "vitest";

import type { Db } from "@/lib/db/client";
import type { VerifiedUserId } from "@/lib/services/auth";
import { acquireHelpLeaseService } from "./help-consumption";

const userId = "00000000-0000-4000-8000-000000000001" as VerifiedUserId;
const leaseId = "00000000-0000-4000-8000-000000000002";
const now = new Date("2026-11-21T18:00:00.000Z");

function fakeDb(...results: unknown[]) {
  const execute = vi.fn();
  for (const result of results) execute.mockResolvedValueOnce(result);
  return { db: { execute } as unknown as Db, execute };
}

describe("acquireHelpLeaseService", () => {
  it("returns a lease and releases only its own active request", async () => {
    const { db, execute } = fakeDb([{ lease_id: leaseId }], []);

    const lease = await acquireHelpLeaseService(userId, now, leaseId, db);
    await lease.release();

    expect(lease.id).toBe(leaseId);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("throws HELP_RATE_LIMITED when the shared window is exhausted", async () => {
    const { db } = fakeDb([], [{ rate_limited: true }]);

    await expect(acquireHelpLeaseService(userId, now, leaseId, db)).rejects.toMatchObject({
      code: "HELP_RATE_LIMITED",
    });
  });

  it("throws HELP_BUSY when another instance holds the lease", async () => {
    const { db } = fakeDb([], [{ rate_limited: false }]);

    await expect(acquireHelpLeaseService(userId, now, leaseId, db)).rejects.toMatchObject({
      code: "HELP_BUSY",
    });
  });
});
