import "server-only";

import { eq } from "drizzle-orm";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { profiles } from "@/lib/db/profile/table";

/** Read-only profile data for the dashboard; null when the row is missing. */
export async function getProfileSummaryService(
  userId: string,
  db: Db = getDrizzleClient(),
): Promise<{ displayName: string | null }> {
  const [profile] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return { displayName: profile?.displayName ?? null };
}
