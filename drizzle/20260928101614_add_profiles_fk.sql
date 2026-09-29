-- Add FK from profiles.id to auth.users(id) with cascade delete.
-- This ensures referential integrity: when an auth user is deleted,
-- their profile is automatically removed.
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_id_auth_users_id_fk"
  FOREIGN KEY ("id")
  REFERENCES "auth"."users"("id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;
