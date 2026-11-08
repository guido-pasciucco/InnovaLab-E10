-- Closes the public Data API (PostgREST) for this project: no table in
-- `public` can be reached with the publishable key anymore, with or without
-- a user JWT.
--
-- Why: the app never queries PostgREST. lib/services goes through Drizzle
-- (connection pooler, role `postgres`, BYPASSRLS); the Supabase clients
-- (lib/supabase/*) are used for Auth (GoTrue, `/auth/v1/`) only. Nothing in
-- the app queries PostgREST; lib/db/data-api.int.test.ts pins the closure.
-- RLS policies stay enabled as passive defense in depth; they are simply no
-- longer reachable through the API.
--
-- What this does NOT touch:
--   - `service_role` keeps its grants (server-side Admin API used by test
--     factories and scripts/seed).
--   - The `auth` schema and GoTrue endpoints (login, signup, refresh).
--   - Migrations/seeds (DIRECT_URL / Drizzle, role `postgres`).
--> statement-breakpoint
REVOKE USAGE ON SCHEMA "public" FROM "anon", "authenticated";
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM "anon", "authenticated";
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM "anon", "authenticated";
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "public" FROM "anon", "authenticated";
--> statement-breakpoint
-- Future objects created by the migrating role keep the door closed too.
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon", "authenticated";
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon", "authenticated";
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon", "authenticated";
