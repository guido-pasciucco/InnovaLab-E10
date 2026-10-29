ALTER TABLE "calc_cost_lines" DROP CONSTRAINT "calc_cost_lines_source_business_cost_id_business_cost_lines_id_fk";
--> statement-breakpoint
ALTER TABLE "calc_cost_lines" ALTER COLUMN "source_business_cost_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "calc_cost_lines" ADD CONSTRAINT "calc_cost_lines_source_business_cost_id_business_cost_lines_id_fk" FOREIGN KEY ("source_business_cost_id") REFERENCES "public"."business_cost_lines"("id") ON DELETE set null ON UPDATE no action;