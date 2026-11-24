import "server-only";

import { cache } from "react";

import type { VerifiedUserId } from "@/lib/services/auth";
import { getProfileSummaryService } from "@/lib/services/profile";
import { getUserDefaultBusiness } from "@/lib/services/supplies";

// Profile and default business shown by the shell. Cached per request so the
// layout and a page that also needs them share a single lookup.
export const getShellIdentity = cache(async (userId: VerifiedUserId) => {
  const [profile, business] = await Promise.all([
    getProfileSummaryService(userId),
    getUserDefaultBusiness(userId),
  ]);
  return { displayName: profile.displayName ?? "", businessName: business?.name ?? "" };
});
