CREATE TABLE "presentation_packaging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"presentation_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"unit" text NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "presentation_packaging_quantity_positive" CHECK ("presentation_packaging"."quantity" > 0),
	CONSTRAINT "presentation_packaging_unit_not_empty" CHECK (length(btrim("presentation_packaging"."unit")) > 0)
);
--> statement-breakpoint
CREATE TABLE "presentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"units_per_presentation" numeric(14, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "presentations_units_positive" CHECK ("presentations"."units_per_presentation" > 0),
	CONSTRAINT "presentations_units_integer" CHECK ("presentations"."units_per_presentation" = floor("presentations"."units_per_presentation"))
);
--> statement-breakpoint
ALTER TABLE "presentation_packaging" ADD CONSTRAINT "presentation_packaging_presentation_id_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentation_packaging" ADD CONSTRAINT "presentation_packaging_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "presentation_packaging_presentation_supply_uq" ON "presentation_packaging" USING btree ("presentation_id","supply_id");--> statement-breakpoint
CREATE INDEX "presentation_packaging_supply_id_idx" ON "presentation_packaging" USING btree ("supply_id");--> statement-breakpoint
CREATE UNIQUE INDEX "presentations_product_name_uq" ON "presentations" USING btree ("product_id","name");