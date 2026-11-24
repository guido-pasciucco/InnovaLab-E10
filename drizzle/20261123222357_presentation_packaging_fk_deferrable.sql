-- Packaging used by a presentation cannot be deleted while the presentation
-- row remains. NO ACTION is deferred so a profile/business cascade can remove
-- the presentation packaging and the supply in the same transaction (account
-- deletion); a direct DELETE of the supply still fails when the transaction
-- commits. Same pattern as 20261112224829_product_ingredients_fk_deferrable.
ALTER TABLE "presentation_packaging"
  DROP CONSTRAINT "presentation_packaging_supply_id_supplies_id_fk";
--> statement-breakpoint
ALTER TABLE "presentation_packaging"
  ADD CONSTRAINT "presentation_packaging_supply_id_supplies_id_fk"
  FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id")
  ON DELETE no action ON UPDATE no action
  DEFERRABLE INITIALLY DEFERRED;
