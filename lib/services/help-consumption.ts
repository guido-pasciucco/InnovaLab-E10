import "server-only";

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";
import type { VerifiedUserId } from "@/lib/services/auth";

export const HELP_RATE_LIMIT = 10;
export const HELP_RATE_WINDOW_MS = 60_000;
export const HELP_REQUEST_TIMEOUT_MS = 20_000;

type LeaseRow = { lease_id: string };

export type HelpLease = {
  id: string;
  release: () => Promise<void>;
};

// One atomic statement enforces the fixed request window and the one-request
// lease. PostgreSQL is shared by every Vercel instance, so neither control is
// process-local. Expired leases recover automatically after a crashed worker.
export async function acquireHelpLeaseService(
  userId: VerifiedUserId,
  now: Date = new Date(),
  leaseId: string = randomUUID(),
  db: Db = getDrizzleClient(),
): Promise<HelpLease> {
  const windowStartedAt = new Date(now.getTime() - HELP_RATE_WINDOW_MS);
  const activeUntil = new Date(now.getTime() + HELP_REQUEST_TIMEOUT_MS);
  const nowIso = now.toISOString();
const windowStartedAtIso = windowStartedAt.toISOString();
const activeUntilIso = activeUntil.toISOString();

const rows = await db.execute<LeaseRow>(sql`
  INSERT INTO help_usage (
    user_id, window_started_at, request_count, active_lease_id, active_until
  ) VALUES (
    ${userId},
    ${nowIso}::text::timestamptz,
    1,
    ${leaseId},
    ${activeUntilIso}::text::timestamptz
  )
  ON CONFLICT (user_id) DO UPDATE SET
    window_started_at = CASE
      WHEN help_usage.window_started_at <= ${windowStartedAtIso}::text::timestamptz
        THEN ${nowIso}::text::timestamptz
      ELSE help_usage.window_started_at
    END,
    request_count = CASE
      WHEN help_usage.window_started_at <= ${windowStartedAtIso}::text::timestamptz
        THEN 1
      ELSE help_usage.request_count + 1
    END,
    active_lease_id = ${leaseId},
    active_until = ${activeUntilIso}::text::timestamptz
  WHERE
    (help_usage.window_started_at <= ${windowStartedAtIso}::text::timestamptz
      OR help_usage.request_count < ${HELP_RATE_LIMIT})
    AND (
      help_usage.active_until IS NULL
      OR help_usage.active_until <= ${nowIso}::text::timestamptz
    )
  RETURNING active_lease_id AS lease_id
`);


  if (rows.length === 0) {

const state = await db.execute<{ rate_limited: boolean }>(sql`
  SELECT (
    window_started_at > ${windowStartedAtIso}::text::timestamptz
    AND request_count >= ${HELP_RATE_LIMIT}
  ) AS rate_limited
  FROM help_usage
  WHERE user_id = ${userId}
`);
    throw new AppError(state[0]?.rate_limited ? "HELP_RATE_LIMITED" : "HELP_BUSY");
  }

  return {
    id: leaseId,
    release: async () => {
      await db.execute(sql`
        UPDATE help_usage
        SET active_lease_id = NULL, active_until = NULL
        WHERE user_id = ${userId} AND active_lease_id = ${leaseId}
      `);
    },
  };
}
