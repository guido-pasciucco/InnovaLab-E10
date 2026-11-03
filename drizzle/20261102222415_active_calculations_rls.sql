-- active_calculations: owner-only access (same pattern as calculations)
ALTER TABLE "active_calculations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "active_calculations_owner_select" ON "active_calculations"
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "active_calculations_owner_insert" ON "active_calculations"
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "active_calculations_owner_update" ON "active_calculations"
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "active_calculations_owner_delete" ON "active_calculations"
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
