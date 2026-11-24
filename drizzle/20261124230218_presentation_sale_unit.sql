ALTER TABLE "presentations" ADD COLUMN "monthly_capacity" integer;--> statement-breakpoint
ALTER TABLE "presentations" ADD COLUMN "markup_percent" numeric(7, 2);--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_monthly_capacity_non_negative" CHECK ("presentations"."monthly_capacity" >= 0);--> statement-breakpoint
-- Capacity stays null: the product value counts base units, a presentation counts packs.
UPDATE "presentations" AS presentation
SET "markup_percent" = product."markup_percent"
FROM "products" AS product
WHERE presentation."product_id" = product."id"
  AND product."markup_percent" IS NOT NULL;