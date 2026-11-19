ALTER TABLE "products" ADD COLUMN "yield_quantity" integer;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_yield_quantity_positive" CHECK ("products"."yield_quantity" IS NULL OR "products"."yield_quantity" > 0);
