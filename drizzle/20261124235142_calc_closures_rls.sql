-- Custom SQL migration file, put your code below! --
-- Defense in depth for #322: Drizzle connects as a BYPASSRLS role and the
-- public Data API is revoked, but the table still gets the same owner-only
-- policy as the rest of the catalog. Closures are append-only from the app:
-- authenticated roles can only SELECT their own rows, never insert, update or
-- delete them. Writes go through services using the owner role.
--> statement-breakpoint
ALTER TABLE "calc_closures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "calc_closures_owner_select" ON "calc_closures"
  FOR SELECT TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_user_id = auth.uid()
    )
  );
