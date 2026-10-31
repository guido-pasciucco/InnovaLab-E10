-- calc_supply_purchases: access via owning calculation
ALTER TABLE "calc_supply_purchases" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "calc_supply_purchases_owner_select" ON "calc_supply_purchases"
  FOR SELECT TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "calc_supply_purchases_owner_insert" ON "calc_supply_purchases"
  FOR INSERT TO authenticated
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "calc_supply_purchases_owner_update" ON "calc_supply_purchases"
  FOR UPDATE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()))
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "calc_supply_purchases_owner_delete" ON "calc_supply_purchases"
  FOR DELETE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
