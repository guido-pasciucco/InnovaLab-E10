ALTER TABLE "tender_drafts" DROP CONSTRAINT "tender_drafts_pkey";--> statement-breakpoint
ALTER TABLE "tender_drafts" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
-- There was one draft per emprendedor, so every existing row becomes N° 1.
ALTER TABLE "tender_drafts" ADD COLUMN "number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_drafts" ALTER COLUMN "number" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "tender_drafts_owner_idx" ON "tender_drafts" USING btree ("owner_user_id");--> statement-breakpoint
ALTER TABLE "tender_drafts" ADD CONSTRAINT "tender_drafts_owner_number_uq" UNIQUE("owner_user_id","number");
