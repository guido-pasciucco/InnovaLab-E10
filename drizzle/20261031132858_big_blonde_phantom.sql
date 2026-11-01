CREATE TABLE "calc_supply_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calculation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"unit" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calc_supply_purchases" ADD CONSTRAINT "calc_supply_purchases_calculation_id_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."calculations"("id") ON DELETE cascade ON UPDATE no action;