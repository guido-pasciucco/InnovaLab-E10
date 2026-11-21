CREATE TABLE "tender_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_item_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tender_offers_unit_price_positive" CHECK ("tender_offers"."unit_price" > 0),
	CONSTRAINT "tender_offers_round_positive" CHECK ("tender_offers"."round" >= 1)
);
--> statement-breakpoint
ALTER TABLE "tender_offers" ADD CONSTRAINT "tender_offers_tender_item_id_tender_items_id_fk" FOREIGN KEY ("tender_item_id") REFERENCES "public"."tender_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_offers" ADD CONSTRAINT "tender_offers_invitation_id_tender_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."tender_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tender_offers_invitation_item_idx" ON "tender_offers" USING btree ("invitation_id","tender_item_id");--> statement-breakpoint
CREATE INDEX "tender_offers_item_idx" ON "tender_offers" USING btree ("tender_item_id");