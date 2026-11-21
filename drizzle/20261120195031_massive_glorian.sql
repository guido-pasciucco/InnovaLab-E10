ALTER TABLE "products" ADD COLUMN "variable_cost_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variable_cost_unit_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variable_cost_unit_numerator" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variable_cost_unit_denominator" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variable_cost_recipe_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variable_cost_recipe_numerator" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variable_cost_recipe_denominator" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variable_cost_unavailable_code" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variable_cost_calculated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_variable_cost_status_valid" CHECK ("products"."variable_cost_status" IN ('pending', 'ready', 'unavailable'));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_variable_cost_ready_shape" CHECK ((
      "products"."variable_cost_status" = 'ready'
      AND "products"."variable_cost_unit_amount" IS NOT NULL
      AND "products"."variable_cost_unit_numerator" ~ '^[0-9]+$'
      AND "products"."variable_cost_unit_denominator" ~ '^[1-9][0-9]*$'
      AND "products"."variable_cost_recipe_amount" IS NOT NULL
      AND "products"."variable_cost_recipe_numerator" ~ '^[0-9]+$'
      AND "products"."variable_cost_recipe_denominator" ~ '^[1-9][0-9]*$'
      AND "products"."variable_cost_unavailable_code" IS NULL
      AND "products"."variable_cost_calculated_at" IS NOT NULL
    ) OR (
      "products"."variable_cost_status" IN ('pending', 'unavailable')
      AND "products"."variable_cost_unit_amount" IS NULL
      AND "products"."variable_cost_unit_numerator" IS NULL
      AND "products"."variable_cost_unit_denominator" IS NULL
      AND "products"."variable_cost_recipe_amount" IS NULL
      AND "products"."variable_cost_recipe_numerator" IS NULL
      AND "products"."variable_cost_recipe_denominator" IS NULL
    ));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_variable_cost_amounts_nonnegative" CHECK (("products"."variable_cost_unit_amount" IS NULL OR "products"."variable_cost_unit_amount" >= 0)
      AND ("products"."variable_cost_recipe_amount" IS NULL OR "products"."variable_cost_recipe_amount" >= 0));