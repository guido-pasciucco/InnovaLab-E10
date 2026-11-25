CREATE TABLE "calc_closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"period" text NOT NULL,
	"version" integer NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"snapshot" jsonb NOT NULL,
	"snapshot_schema_version" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calc_closures" ADD CONSTRAINT "calc_closures_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calc_closures_business_period_version_uq" ON "calc_closures" USING btree ("business_id","period","version");