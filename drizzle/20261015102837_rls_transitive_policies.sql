-- Custom SQL migration file, put your code below! --
-- BUG-001: transitive ownership on INSERT/UPDATE for calculations and
-- calc_cost_lines (see docs/bugs/BUG-001-rls-insert-no-ata-fks-al-dueno.md).
--> statement-breakpoint
DROP POLICY IF EXISTS "calculations_owner_insert" ON "calculations";
--> statement-breakpoint
CREATE POLICY "calculations_owner_insert" ON "calculations"
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (business_id, product_id) IN (
      SELECT b.id, p.id
      FROM products p
      JOIN businesses b ON b.id = p.business_id
      WHERE b.owner_user_id = auth.uid()
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "calculations_owner_update" ON "calculations";
--> statement-breakpoint
CREATE POLICY "calculations_owner_update" ON "calculations"
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (business_id, product_id) IN (
      SELECT b.id, p.id
      FROM products p
      JOIN businesses b ON b.id = p.business_id
      WHERE b.owner_user_id = auth.uid()
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "calc_cost_lines_owner_insert" ON "calc_cost_lines";
--> statement-breakpoint
CREATE POLICY "calc_cost_lines_owner_insert" ON "calc_cost_lines"
  FOR INSERT TO authenticated
  WITH CHECK (
    calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid())
    AND source_business_cost_id IN (
      SELECT l.id
      FROM business_cost_lines l
      JOIN businesses b ON b.id = l.business_id
      WHERE b.owner_user_id = auth.uid()
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "calc_cost_lines_owner_update" ON "calc_cost_lines";
--> statement-breakpoint
CREATE POLICY "calc_cost_lines_owner_update" ON "calc_cost_lines"
  FOR UPDATE TO authenticated
  USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()))
  WITH CHECK (
    calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid())
    AND source_business_cost_id IN (
      SELECT l.id
      FROM business_cost_lines l
      JOIN businesses b ON b.id = l.business_id
      WHERE b.owner_user_id = auth.uid()
    )
  );
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_owner_user_id_idx" ON "businesses" ("owner_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_business_id_idx" ON "products" ("business_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_cost_lines_business_id_idx" ON "business_cost_lines" ("business_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculations_user_id_idx" ON "calculations" ("user_id");