import { createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { profiles } from "./table";

// ---------------------------------------------------------------------------
// Evaluation spike only: Zod schemas derived from the Drizzle tables.
// Rule: the client sends a public input (no ids, no server-owned FKs, no
// timestamps). The server injects server-controlled fields (ownerUserId from
// the session, businessId/calculationId from the route, ids/timestamps from
// the database) before insert.
// ---------------------------------------------------------------------------

// --- Persisted rows: mirror exactly what comes back from the database. ---

export const profileRowSchema = createSelectSchema(profiles);

// No public input schema for profiles: rows mirror Supabase Auth and are
// created server-side.

// --- Inferred input/row types: single source of truth, no manual interfaces. ---

export type ProfileRow = z.infer<typeof profileRowSchema>;
