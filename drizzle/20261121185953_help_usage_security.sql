ALTER TABLE "help_usage"
  ADD CONSTRAINT "help_usage_user_id_auth_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "help_usage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "help_usage" FROM anon, authenticated;
