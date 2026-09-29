-- Enable RLS on all public tables
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_cost_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scenarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calc_cost_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "computed_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "costing_setup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pricing_inputs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- profiles: users can only access their own profile
CREATE POLICY "profiles_owner_select" ON "profiles"
  FOR SELECT TO authenticated
  USING (id = auth.uid());
--> statement-breakpoint
CREATE POLICY "profiles_owner_insert" ON "profiles"
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
--> statement-breakpoint
CREATE POLICY "profiles_owner_update" ON "profiles"
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
--> statement-breakpoint
CREATE POLICY "profiles_owner_delete" ON "profiles"
  FOR DELETE TO authenticated
  USING (id = auth.uid());
--> statement-breakpoint
-- businesses: owner-only access
CREATE POLICY "businesses_owner_select" ON "businesses"
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "businesses_owner_insert" ON "businesses"
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "businesses_owner_update" ON "businesses"
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "businesses_owner_delete" ON "businesses"
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());
--> statement-breakpoint
-- products: access via owning business
CREATE POLICY "products_owner_select" ON "products"
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "products_owner_insert" ON "products"
  FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "products_owner_update" ON "products"
  FOR UPDATE TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "products_owner_delete" ON "products"
  FOR DELETE TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));
--> statement-breakpoint
-- business_cost_lines: access via owning business
CREATE POLICY "business_cost_lines_owner_select" ON "business_cost_lines"
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "business_cost_lines_owner_insert" ON "business_cost_lines"
  FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "business_cost_lines_owner_update" ON "business_cost_lines"
  FOR UPDATE TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "business_cost_lines_owner_delete" ON "business_cost_lines"
  FOR DELETE TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));
--> statement-breakpoint
-- calculations: owner-only access
CREATE POLICY "calculations_owner_select" ON "calculations"
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "calculations_owner_insert" ON "calculations"
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "calculations_owner_update" ON "calculations"
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "calculations_owner_delete" ON "calculations"
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
--> statement-breakpoint
-- scenarios: access via owning calculation
CREATE POLICY "scenarios_owner_select" ON "scenarios"
  FOR SELECT TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "scenarios_owner_insert" ON "scenarios"
  FOR INSERT TO authenticated
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "scenarios_owner_update" ON "scenarios"
  FOR UPDATE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()))
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "scenarios_owner_delete" ON "scenarios"
  FOR DELETE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
-- calc_cost_lines: access via owning calculation
CREATE POLICY "calc_cost_lines_owner_select" ON "calc_cost_lines"
  FOR SELECT TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "calc_cost_lines_owner_insert" ON "calc_cost_lines"
  FOR INSERT TO authenticated
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "calc_cost_lines_owner_update" ON "calc_cost_lines"
  FOR UPDATE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()))
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "calc_cost_lines_owner_delete" ON "calc_cost_lines"
  FOR DELETE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
-- computed_results: access via owning calculation
CREATE POLICY "computed_results_owner_select" ON "computed_results"
  FOR SELECT TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "computed_results_owner_insert" ON "computed_results"
  FOR INSERT TO authenticated
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "computed_results_owner_update" ON "computed_results"
  FOR UPDATE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()))
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "computed_results_owner_delete" ON "computed_results"
  FOR DELETE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
-- costing_setup: access via owning calculation
CREATE POLICY "costing_setup_owner_select" ON "costing_setup"
  FOR SELECT TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "costing_setup_owner_insert" ON "costing_setup"
  FOR INSERT TO authenticated
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "costing_setup_owner_update" ON "costing_setup"
  FOR UPDATE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()))
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "costing_setup_owner_delete" ON "costing_setup"
  FOR DELETE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
-- pricing_inputs: access via owning calculation
CREATE POLICY "pricing_inputs_owner_select" ON "pricing_inputs"
  FOR SELECT TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "pricing_inputs_owner_insert" ON "pricing_inputs"
  FOR INSERT TO authenticated
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "pricing_inputs_owner_update" ON "pricing_inputs"
  FOR UPDATE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()))
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY "pricing_inputs_owner_delete" ON "pricing_inputs"
  FOR DELETE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
