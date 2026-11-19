ALTER TABLE "product_ingredients" ADD COLUMN "unit" text;--> statement-breakpoint
UPDATE "product_ingredients" AS "pi"
SET "unit" = "s"."minimum_unit"
FROM "supplies" AS "s"
WHERE "pi"."supply_id" = "s"."id";--> statement-breakpoint
ALTER TABLE "product_ingredients" ALTER COLUMN "unit" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_unit_not_empty" CHECK (length(btrim("product_ingredients"."unit")) > 0);