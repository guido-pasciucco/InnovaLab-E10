CREATE TABLE "tender_negotiations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" uuid NOT NULL,
	"supplier_user_id" uuid NOT NULL,
	"negotiation_requested_at" timestamp with time zone,
	"negotiation_contact" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tender_negotiations_tender_supplier_uq" UNIQUE("tender_id","supplier_user_id")
);
--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "invitation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_awards" ALTER COLUMN "invitation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_offers" ALTER COLUMN "invitation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "supplier_user_id" uuid;--> statement-breakpoint
ALTER TABLE "tender_awards" ADD COLUMN "supplier_user_id" uuid;--> statement-breakpoint
ALTER TABLE "tender_offers" ADD COLUMN "supplier_user_id" uuid;--> statement-breakpoint
ALTER TABLE "tender_negotiations" ADD CONSTRAINT "tender_negotiations_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_negotiations" ADD CONSTRAINT "tender_negotiations_supplier_user_id_suppliers_user_id_fk" FOREIGN KEY ("supplier_user_id") REFERENCES "public"."suppliers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tender_negotiations_supplier_idx" ON "tender_negotiations" USING btree ("supplier_user_id");--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_user_id_suppliers_user_id_fk" FOREIGN KEY ("supplier_user_id") REFERENCES "public"."suppliers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_awards" ADD CONSTRAINT "tender_awards_supplier_user_id_suppliers_user_id_fk" FOREIGN KEY ("supplier_user_id") REFERENCES "public"."suppliers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_offers" ADD CONSTRAINT "tender_offers_supplier_user_id_suppliers_user_id_fk" FOREIGN KEY ("supplier_user_id") REFERENCES "public"."suppliers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tender_awards_supplier_idx" ON "tender_awards" USING btree ("supplier_user_id");--> statement-breakpoint
CREATE INDEX "tender_offers_supplier_item_idx" ON "tender_offers" USING btree ("supplier_user_id","tender_item_id");--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tender_supplier_uq" UNIQUE("tender_id","supplier_user_id");