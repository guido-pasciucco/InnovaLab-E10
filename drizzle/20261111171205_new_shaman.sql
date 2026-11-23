ALTER TABLE "supplies" ADD COLUMN "kind" text DEFAULT 'supply' NOT NULL;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "purchase_quantity" numeric(14, 4) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "purchase_unit" text DEFAULT 'unidad' NOT NULL;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "minimum_unit" text DEFAULT 'unidad' NOT NULL;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "conversion_factor" numeric(14, 4) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_purchase_quantity_positive" CHECK ("supplies"."purchase_quantity" > 0);--> statement-breakpoint
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_conversion_factor_positive" CHECK ("supplies"."conversion_factor" > 0);--> statement-breakpoint
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_kind_valid" CHECK ("supplies"."kind" in ('supply', 'packaging'));