CREATE TABLE "active_calculations" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"calculation_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "active_calculations" ADD CONSTRAINT "active_calculations_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_calculations" ADD CONSTRAINT "active_calculations_calculation_id_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."calculations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calculations_user_status_created_idx" ON "calculations" USING btree ("user_id","status","created_at");