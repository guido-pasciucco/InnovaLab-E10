-- A supply used by a recipe cannot be deleted while the recipe line remains.
-- NO ACTION is deferred so a profile/business cascade can remove the recipe
-- lines and the supply in the same transaction (account deletion); a direct
-- DELETE of a supply still fails when the transaction commits. RESTRICT would
-- check immediately and break the owner cascade.
ALTER TABLE "product_ingredients"
  DROP CONSTRAINT "product_ingredients_supply_id_supplies_id_fk";
--> statement-breakpoint
ALTER TABLE "product_ingredients"
  ADD CONSTRAINT "product_ingredients_supply_id_supplies_id_fk"
  FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id")
  ON DELETE no action ON UPDATE no action
  DEFERRABLE INITIALLY DEFERRED;
